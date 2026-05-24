import type { PhotoAnalysisResult, PhotoAsset, PhotoAssumption } from "@/lib/workspace/types";

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

export function extractPhotoAssumptions(photos: PhotoAsset[]): PhotoAssumption[] {
  const types = new Set(photos.map((p) => p.type));
  const assumptions: PhotoAssumption[] = [];
  if (types.has("front_yard")) {
    assumptions.push({
      id: "area-type",
      label: "Area type",
      value: "Looks like a front foundation or curb-appeal bed",
      confidence: "medium",
      editable: true,
    });
  }
  if (types.has("side_yard")) {
    assumptions.push({
      id: "privacy-corridor",
      label: "Possible privacy gap",
      value: "Side-yard photos often need screening and salt/walkway checks",
      confidence: "low",
      editable: true,
    });
  }
  if (types.has("measurement")) {
    assumptions.push({
      id: "measurements",
      label: "Measurements",
      value: "A measurement photo is available; confirm exact length and width before generating",
      confidence: "good",
      editable: true,
    });
  }
  if (types.has("existing_plants")) {
    assumptions.push({
      id: "plant-id",
      label: "Plant identification",
      value:
        "Plant material is visible, but species is not confirmed. Add a leaf close-up or confirm plant names if known.",
      confidence: "low",
      editable: true,
    });
  }
  assumptions.push({
    id: "sun",
    label: "Sun exposure",
    value: "Not enough information yet",
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
            label: "Front planting bed",
            type: "planting_bed" as const,
            confidence: 0.62,
          },
        ]
      : []),
    ...(types.has("problem_area")
      ? [{ id: "problem", label: "Problem area", type: "problem_area" as const, confidence: 0.55 }]
      : []),
    ...(types.has("side_yard")
      ? [{ id: "privacy-gap", label: "Privacy gap", type: "privacy_gap" as const, confidence: 0.5 }]
      : []),
  ];
}

export function suggestMeasurementsToAsk(photos: PhotoAsset[], unusableCount = 0): string[] {
  const types = new Set(photos.map((p) => p.type));
  return [
    ...(unusableCount > 0 ? ["Retake unusable photos before relying on planting zones."] : []),
    ...(types.has("measurement")
      ? ["Confirm length and width from the measurement photo."]
      : ["Add bed length and width if you know them."]),
    "Confirm sun exposure: 6+ hours, 3-6 hours, or mostly shade.",
    "Confirm whether water sits here after rain.",
  ];
}

export function estimateConfidenceFromPhotoData(photos: PhotoAsset[]): number {
  const usable = usablePhotos(photos);
  const penalty = photos.some((photo) => photo.quality === "needs_review") ? 0.08 : 0;
  const unusablePenalty = photos.some((photo) => photo.quality === "unusable") ? 0.12 : 0;
  return Math.max(0.18, confidenceFor(usable.length) - penalty - unusablePenalty);
}
