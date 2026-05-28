import type {
  PhotoAnalysisResult,
  PhotoAsset,
  PhotoAssetType,
  PhotoAssumption,
  PhotoDerivedIntake,
} from "@/lib/workspace/types";

/**
 * Suggest survey answers from honest, photo-grounded signals. Conservative by
 * design: it only sets a field when there's a real, user-confirmable signal
 * (the photo type the user chose, the vision model's sun estimate, or a coarse
 * pixel read), and never invents measurements. Everything here is a draft the
 * user confirms in the intake — it never feeds the plan directly.
 */
export function derivePhotoIntake(args: {
  photoTypes: PhotoAssetType[];
  region?: { greenRatio: number; hardscapeRatio: number; skyRatio: number; shadowRatio: number } | null;
  visionSun?: string;
}): PhotoDerivedIntake {
  const types = new Set(args.photoTypes);
  const derived: PhotoDerivedIntake = {};

  // Area type — from the shot the user labelled.
  if (types.has("front_yard")) derived.areaType = "foundation-bed";
  else if (types.has("side_yard")) derived.areaType = "fence-line";
  else if (types.has("backyard")) derived.areaType = "lawn-corner";

  // Problem type — only where the user's own labelling signals it (not guessed from pixels).
  if (types.has("side_yard")) derived.problemType = "privacy_gap";
  else if (types.has("soil_drainage")) derived.problemType = "muddy_erosion";

  // Drainage — only when the user explicitly flagged a drainage shot.
  if (types.has("soil_drainage")) derived.drainage = "poor";

  // Scope — from how much of the yard the photos cover.
  const usableTypeCount = types.size;
  if ((types.has("front_yard") && types.has("backyard")) || usableTypeCount >= 3) {
    derived.scope = "whole_area_plan";
  } else if (types.has("problem_area") && usableTypeCount === 1) {
    derived.scope = "spot_fix";
  } else {
    derived.scope = "section_plan";
  }

  // Sun — trust only the vision model's estimate; a single photo's shadows are unreliable.
  if (args.visionSun === "full-sun" || args.visionSun === "part-sun" || args.visionSun === "shade") {
    derived.sun = args.visionSun;
  }

  if (args.region) {
    derived.greeneryRatio = args.region.greenRatio;
    derived.hardscapeRatio = args.region.hardscapeRatio;
  }

  return derived;
}

function confidenceFor(count: number): number {
  if (count >= 3) return 0.72;
  if (count === 2) return 0.62;
  if (count === 1) return 0.48;
  return 0.25;
}

function usablePhotos(photos: PhotoAsset[]): PhotoAsset[] {
  return photos.filter((photo) => photo.quality !== "unusable");
}

export async function analyzeYardPhotos(photos: PhotoAsset[]): Promise<PhotoAnalysisResult> {
  const usable = usablePhotos(photos);
  const types = new Set(usable.map((p) => p.type));
  const poorPhotos = photos.filter((p) => p.quality === "needs_review");
  const unusablePhotos = photos.filter((p) => p.quality === "unusable");
  const assumptions = extractPhotoAssumptions(usable);
  const zones = detectPlanningZones(usable);
  const missingInfo = suggestMeasurementsToAsk(usable, unusablePhotos.length);
  const risks = [
    ...(poorPhotos.length > 0
      ? [
          `${poorPhotos.length} photo(s) need review because lighting, blur, or size may reduce accuracy.`,
        ]
      : []),
    ...(unusablePhotos.length > 0
      ? [
          `${unusablePhotos.length} photo(s) were excluded from analysis. Retake before final buying decisions.`,
        ]
      : []),
    ...(types.has("problem_area")
      ? ["Problem-area photos need on-site confirmation before buying plants."]
      : []),
    ...(types.has("soil_drainage") ? ["Drainage looks important here; confirm after rain."] : []),
    "Photo analysis is a planning aid, not a site survey.",
  ];

  return {
    zones,
    detectedObjects: [
      ...(types.has("front_yard") ? ["house foundation / front bed context"] : []),
      ...(types.has("existing_plants") ? ["plant material visible (species not confirmed)"] : []),
      ...(types.has("measurement") ? ["measurement reference"] : []),
      ...(types.has("inspiration") ? ["style inspiration"] : []),
      ...(poorPhotos.length > 0 ? ["photo quality warning"] : []),
    ],
    assumptions,
    missingInfo,
    risks,
    confidence: estimateConfidenceFromPhotoData(photos),
    generatedAt: Date.now(),
  };
}

// Display copy (label/value/missingInfo) is emitted as STABLE i18n KEYS, not prose, so
// this stays framework-free (no next-intl) while the UI resolves them per-locale at the
// render boundary (PhotoIntake namespace). Keys fall back to themselves if unresolved,
// so older persisted drafts and test fixtures with literal text still render.
export function extractPhotoAssumptions(photos: PhotoAsset[]): PhotoAssumption[] {
  const types = new Set(photos.map((p) => p.type));
  const assumptions: PhotoAssumption[] = [];
  if (types.has("front_yard")) {
    assumptions.push({
      id: "area-type",
      label: "assumeAreaTypeLabel",
      value: "assumeAreaTypeValue",
      confidence: "medium",
      editable: true,
    });
  }
  if (types.has("side_yard")) {
    assumptions.push({
      id: "privacy-corridor",
      label: "assumePrivacyLabel",
      value: "assumePrivacyValue",
      confidence: "low",
      editable: true,
    });
  }
  if (types.has("measurement")) {
    assumptions.push({
      id: "measurements",
      label: "assumeMeasureLabel",
      value: "assumeMeasureValue",
      confidence: "good",
      editable: true,
    });
  }
  if (types.has("existing_plants")) {
    assumptions.push({
      id: "plant-id",
      label: "assumePlantLabel",
      value: "assumePlantValue",
      confidence: "low",
      editable: true,
    });
  }
  assumptions.push({
    id: "sun",
    label: "assumeSunLabel",
    value: "assumeSunValue",
    confidence: "low",
    editable: true,
  });
  return assumptions;
}

export function detectPlanningZones(photos: PhotoAsset[]): PhotoAnalysisResult["zones"] {
  const types = new Set(photos.map((p) => p.type));
  return [
    ...(types.has("front_yard")
      ? [
          {
            id: "front-bed",
            label: "zoneFrontBed",
            type: "planting_bed" as const,
            confidence: 0.62,
          },
        ]
      : []),
    ...(types.has("problem_area")
      ? [{ id: "problem", label: "zoneProblemArea", type: "problem_area" as const, confidence: 0.55 }]
      : []),
    ...(types.has("side_yard")
      ? [{ id: "privacy-gap", label: "zonePrivacyGap", type: "privacy_gap" as const, confidence: 0.5 }]
      : []),
  ];
}

export function suggestMeasurementsToAsk(photos: PhotoAsset[], unusableCount = 0): string[] {
  const types = new Set(photos.map((p) => p.type));
  return [
    ...(unusableCount > 0 ? ["missingRetakeUnusable"] : []),
    ...(types.has("measurement") ? ["missingConfirmMeasure"] : ["missingAddDims"]),
    "missingConfirmSun",
    "missingConfirmDrainage",
  ];
}

export function estimateConfidenceFromPhotoData(photos: PhotoAsset[]): number {
  const usable = usablePhotos(photos);
  const penalty = photos.some((photo) => photo.quality === "needs_review") ? 0.08 : 0;
  const unusablePenalty = photos.some((photo) => photo.quality === "unusable") ? 0.12 : 0;
  return Math.max(0.18, confidenceFor(usable.length) - penalty - unusablePenalty);
}
