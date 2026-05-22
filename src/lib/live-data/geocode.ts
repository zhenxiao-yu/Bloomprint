import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import { getCached, setCached } from "@/lib/live-data/cache";
import type { CachedLiveData, GeocodeResult } from "@/lib/live-data/types";

export async function getGeocode(query: string): Promise<CachedLiveData<GeocodeResult> | null> {
  const key = `geocode:${query.toLowerCase()}`;
  const cached = getCached<GeocodeResult>(key);
  if (cached) return cached;
  if (process.env.LIVE_DATA_PROVIDER !== "nominatim") return mockGeocode(query);
  return null;
}

function mockGeocode(query: string): CachedLiveData<GeocodeResult> {
  return setCached(
    `geocode:${query.toLowerCase()}`,
    { query, label: query, lat: 0, lon: 0 },
    getCachePolicy("geocode"),
    {
      name: "Mock geocode context",
      sourceName: "Mock geocode context",
      sourceType: "live-context",
      level: 6,
      supports: ["fallback location label only"],
      confidence: "low",
      cacheStatus: "disabled",
      sourceQuality: "AI-only inference",
      needsLocalVerification: true,
    },
  );
}
