/**
 * USDA botanical synonym accessor (live-data layer, server-only).
 *
 * Reads the build-time artifact emitted by `npm run data:synonyms` from the
 * public-domain USDA PLANTS export. It is a pure NAME crosswalk — accepted
 * scientific name + botanical synonyms — used only to widen live-API search
 * terms (Perenual/GBIF) so a plan's plants match more reliably. It carries no
 * characteristics and never touches locked facts (hardiness/toxicity/invasive).
 *
 * Kept out of the Core Library barrel on purpose: importing it only here keeps
 * the JSON out of the client bundle.
 */
import generated from "@/domain/data/usda-synonyms.generated.json";

export interface UsdaSynonyms {
  /** USDA accepted scientific name ("Genus species"). */
  accepted: string;
  /** Alternate botanical names that resolve to the same accepted taxon. */
  synonyms: string[];
}

const MAP = generated as Record<string, UsdaSynonyms>;

/** Full crosswalk entry for a Core Library plant id, or null when none was resolved. */
export function getUsdaSynonyms(plantId: string): UsdaSynonyms | null {
  return MAP[plantId] ?? null;
}

/** Just the synonym names for a plant id — extra search terms for live providers. Never throws. */
export function getPlantSynonymTerms(plantId: string): string[] {
  return MAP[plantId]?.synonyms ?? [];
}
