/**
 * Loader for the build-time GBIF prefetch (src/domain/data/plant-enrichment.generated.json,
 * produced by scripts/build-plant-data.mjs). Reading the artifact means the live layer makes
 * ZERO upstream calls for the fixed Core Library — the common case — so users never hit a
 * free-API wall. Unknown/custom names fall through to a live, cached GBIF lookup.
 */
import generated from "@/domain/data/plant-enrichment.generated.json";

export interface PrefetchedPlant {
  usageKey?: number;
  canonicalName?: string;
  family?: string;
  establishmentMeans: string[];
}

const MAP = generated as Record<string, PrefetchedPlant>;

export function getPrefetchedPlantData(plantId: string | undefined): PrefetchedPlant | null {
  if (!plantId) return null;
  return MAP[plantId] ?? null;
}
