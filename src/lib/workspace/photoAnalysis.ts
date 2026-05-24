import type { PhotoAnalysisResult, PhotoAsset, PhotoAssumption } from "@/lib/workspace/types";

function confidenceFor(count: number): number {
  if (count >= 3) return 0.72;
  if (count === 2) return 0.62;
  if (count === 1) return 0.48;
  return 0.25;
}

export async function analyzeYardPhotos(photos: PhotoAsset[]): Promise<PhotoAnalysisResult> {
  const types = new Set(photos.map((p) => p.type));
  const assumptions = extractPhotoAssumptions(photos);
  const zones = detectPlanningZones(photos);
  const missingInfo = suggestMeasurementsToAsk(photos);
  const risks = [
    ...(types.has("problem_area") ? ["Problem-area photos need on-site confirmation before buying plants."] : []),
    ...(types.has("soil_drainage") ? ["Drainage looks important here; confirm after rain."] : []),
    "Photo analysis is a planning aid, not a site survey.",
  ];

  return {
    zones,
    detectedObjects: [
      ...(types.has("front_yard") ? ["house foundation / front bed context"] : []),
      ...(types.has("existing_plants") ? ["existing plant material"] : []),
      ...(types.has("measurement") ? ["measurement reference"] : []),
      ...(types.has("inspiration") ? ["style inspiration"] : []),
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
      ? [{ id: "front-bed", label: "Front planting bed", type: "planting_bed" as const, confidence: 0.62 }]
      : []),
    ...(types.has("problem_area")
      ? [{ id: "problem", label: "Problem area", type: "problem_area" as const, confidence: 0.55 }]
      : []),
    ...(types.has("side_yard")
      ? [{ id: "privacy-gap", label: "Privacy gap", type: "privacy_gap" as const, confidence: 0.5 }]
      : []),
  ];
}

export function suggestMeasurementsToAsk(photos: PhotoAsset[]): string[] {
  const types = new Set(photos.map((p) => p.type));
  return [
    ...(types.has("measurement") ? ["Confirm length and width from the measurement photo."] : ["Add bed length and width if you know them."]),
    "Confirm sun exposure: 6+ hours, 3-6 hours, or mostly shade.",
    "Confirm whether water sits here after rain.",
  ];
}

export function estimateConfidenceFromPhotoData(photos: PhotoAsset[]): number {
  return confidenceFor(photos.length);
}
