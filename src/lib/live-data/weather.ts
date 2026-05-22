import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import { getCached, setCached } from "@/lib/live-data/cache";
import type { CachedLiveData, WeatherContext } from "@/lib/live-data/types";

export async function getWeatherContext(query: string): Promise<CachedLiveData<WeatherContext> | null> {
  const key = `weather:${query.toLowerCase()}`;
  const cached = getCached<WeatherContext>(key);
  if (cached) return cached;
  if (process.env.LIVE_DATA_PROVIDER !== "open-meteo") return mockWeather(query);
  return null;
}

function mockWeather(query: string): CachedLiveData<WeatherContext> {
  return setCached(
    `weather:${query.toLowerCase()}`,
    {
      locationLabel: query,
      summary: "Weather live check unavailable; use Bloomprint's regional planting window.",
      retrievedAt: new Date().toISOString(),
    },
    getCachePolicy("weather"),
    {
      name: "Mock weather context",
      sourceName: "Mock weather context",
      sourceType: "live-context",
      level: 6,
      supports: ["fallback weather wording only"],
      confidence: "low",
      cacheStatus: "disabled",
      sourceQuality: "AI-only inference",
      needsLocalVerification: true,
    },
  );
}
