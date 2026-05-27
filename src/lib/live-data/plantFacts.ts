/**
 * Plant care facts — intentionally NO live provider.
 *
 * The former Perenual adapter is removed: its free tier paywalls the care-details endpoint
 * (HTTP 429), so it can't be relied on for a free product. Care facts (watering, sunlight,
 * spacing, toxicity) are LOCKED in the Bloomprint Core Library and rendered from there — we
 * never source them from a third-party free API (honesty contract). The live layer's plant
 * value-add is now invasive/establishment context (GBIF) + hardiness (USDA).
 *
 * Kept as a null-returning seam so the enrichment pipeline shape is unchanged: callers simply
 * get no live care facts, and the deterministic plan stands on its own.
 */
import type { PlantFacts } from "@/lib/live-data/schema";
import type { CachedLiveData } from "@/lib/live-data/types";

export async function getPlantFacts(
  scientificName: string,
  commonName?: string,
): Promise<CachedLiveData<PlantFacts> | null> {
  // No free, commercial-OK live care provider — care comes from the Core Library.
  void scientificName;
  void commonName;
  return null;
}
