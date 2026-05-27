/**
 * Planting-timing enrichment — deterministic regional climatology (free, no API, no key).
 *
 * Replaces the former Open-Meteo call: that provider's free tier is CC-BY *non-commercial*,
 * which a Stripe-billed app can't use, and the paid tier needs a key. Instead we surface the
 * Core Library's regional planting window (`RegionPreset.weatherWindow`) — honest, approximate,
 * works everywhere offline, and never blocks the plan. ENRICHMENT ONLY: it confirms the engine's
 * window, never overrides it (docs/DECISIONS.md D1).
 */
import { getRegion } from "@/domain/data";
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import type { CachedLiveData, WeatherContext } from "@/lib/live-data/types";
import type { ConfidenceLevel, SourceRef } from "@/domain/models";

function climatologySource(retrievedAt: string, confidence: ConfidenceLevel): SourceRef {
  return {
    name: "Regional planting window",
    sourceName: "Bloomprint Core Library — regional climatology",
    sourceType: "extension-botanical",
    level: 3,
    retrievedAt,
    supports: ["approximate regional planting window only"],
    confidence,
    cacheStatus: "fresh",
    sourceQuality: "Extension / botanical",
    needsLocalVerification: true,
  };
}

/** Plain-language planting-timing sentence from a region's known window. */
export function regionPlantingSummary(label: string, weatherWindow?: string): string {
  if (!weatherWindow) {
    return "Use your regional planting window and hold tender plantings until after your local last-frost date; confirm a dry-enough stretch before heavy work.";
  }
  return `Approximate planting window for ${label}: ${weatherWindow}. Hold tender plantings until after your local last-frost date, and confirm a dry-enough stretch before laying stone or heavy materials.`;
}

export async function getWeatherContext(
  query: string,
): Promise<CachedLiveData<WeatherContext> | null> {
  const key = `weather:${query.toLowerCase()}`;
  const cached = getCached<WeatherContext>(key);
  if (cached) return cached;

  const region = getRegion(query);
  const label = region?.label ?? query;
  const confidence: ConfidenceLevel = region?.confidence ?? "low";
  const retrievedAt = new Date().toISOString();
  return setCached(
    key,
    {
      locationLabel: label,
      summary: regionPlantingSummary(label, region?.weatherWindow),
      retrievedAt,
    },
    getCachePolicy("weather"),
    climatologySource(retrievedAt, confidence),
  );
}
