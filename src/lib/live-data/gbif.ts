import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import { getCached, setCached } from "@/lib/live-data/cache";
import type { CachedLiveData, GbifContext } from "@/lib/live-data/types";

export async function getGbifContext(scientificName: string): Promise<CachedLiveData<GbifContext> | null> {
  const key = `gbif:${scientificName.toLowerCase()}`;
  const cached = getCached<GbifContext>(key);
  if (cached) return cached;
  if (process.env.LIVE_DATA_PROVIDER !== "gbif") return mockGbif(scientificName);
  return null;
}

function mockGbif(scientificName: string): CachedLiveData<GbifContext> {
  return setCached(
    `gbif:${scientificName.toLowerCase()}`,
    {
      scientificName,
      occurrenceCount: 0,
      note: "GBIF occurrence is supporting context only, not proof of yard suitability.",
    },
    getCachePolicy("gbif"),
    {
      name: "GBIF occurrence context",
      sourceName: "GBIF occurrence context",
      sourceType: "live-context",
      level: 4,
      supports: ["regional occurrence context only"],
      confidence: "low",
      cacheStatus: "disabled",
      sourceQuality: "Extension / botanical",
      needsLocalVerification: true,
    },
  );
}
