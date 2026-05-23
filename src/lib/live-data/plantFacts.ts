/**
 * Plant care enrichment (Perenual-style).
 *
 * ENRICHMENT ONLY: care/water/sun summaries and images. It never sets hardiness,
 * toxicity, or invasive status — those stay locked in the Core Library. The mock
 * returns an honest generic note (no fabricated cultivar specifics); a real Perenual
 * adapter drops in behind `LIVE_DATA_PROVIDER=perenual` and returns null until set.
 */
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import type { PlantFacts } from "@/lib/live-data/schema";
import type { CachedLiveData } from "@/lib/live-data/types";
import type { SourceRef } from "@/domain/models";

function factsSource(retrievedAt: string): SourceRef {
  return {
    name: "Plant care reference",
    sourceName: "Bloomprint Core Library (care summary)",
    sourceType: "extension-botanical",
    level: 4,
    retrievedAt,
    supports: ["general care wording only"],
    confidence: "medium",
    cacheStatus: "disabled",
    sourceQuality: "Extension / botanical",
    needsLocalVerification: true,
  };
}

function mockFacts(scientificName: string, commonName?: string): PlantFacts {
  const lastCheckedAt = new Date().toISOString();
  return {
    scientificName,
    commonName,
    careSummary:
      "General care follows the Bloomprint Core Library. Confirm cultivar-specific watering, light, and spacing on the plant tag at purchase.",
    source: factsSource(lastCheckedAt),
    lastCheckedAt,
  };
}

export async function getPlantFacts(
  scientificName: string,
  commonName?: string,
): Promise<CachedLiveData<PlantFacts> | null> {
  const key = `plant-facts:${scientificName.toLowerCase()}`;
  const cached = getCached<PlantFacts>(key);
  if (cached) return cached;
  if (process.env.LIVE_DATA_PROVIDER === "perenual") return null;
  return setCached(key, mockFacts(scientificName, commonName), getCachePolicy("plant-facts"), factsSource(new Date().toISOString()));
}
