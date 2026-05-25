/**
 * Weather / planting-timing enrichment (Open-Meteo).
 *
 * ENRICHMENT ONLY: a near-term frost/low-temperature read that *confirms* the engine's
 * regional planting window — it never overrides it (docs/DECISIONS.md D1). Offline, when the
 * provider is off, or on any failure → an honest mock note so the plan stands on its own.
 *
 * Licensing — Open-Meteo's free API is CC-BY 4.0 and **non-commercial use only** (no key).
 * Bloomprint bills via Stripe, so production must use the paid tier. The switch is one env var:
 * set `OPEN_METEO_API_KEY` and requests route to `customer-api.open-meteo.com` with `&apikey=` —
 * identical syntax otherwise. Attribution ("Weather data by Open-Meteo.com") is surfaced via the
 * source ref. Until that key is set we are on the free, non-commercial tier by design.
 */
import { z } from "zod";
import { getRegion } from "@/domain/data";
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import type { CachedLiveData, GeocodeResult, WeatherContext } from "@/lib/live-data/types";
import type { SourceRef } from "@/domain/models";

const GEO_FREE = "https://geocoding-api.open-meteo.com/v1/search";
const GEO_PAID = "https://customer-geocoding-api.open-meteo.com/v1/search";
const FORECAST_FREE = "https://api.open-meteo.com/v1/forecast";
const FORECAST_PAID = "https://customer-api.open-meteo.com/v1/forecast";
const FETCH_TIMEOUT_MS = 8000;
const FORECAST_DAYS = 14;
const FROST_C = 0; // daily low at/below this within the window → flag possible frost

const GeoResponse = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().nullish(),
        country_code: z.string().nullish(),
      }),
    )
    .nullish(),
});

const ForecastResponse = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_min: z.array(z.number()),
  }),
});

/** Paid key present → commercial tier (customer-* domain + apikey). Absent → free non-commercial. */
export function openMeteoUrl(freeBase: string, paidBase: string, params: URLSearchParams): string {
  const key = process.env.OPEN_METEO_API_KEY;
  if (key) {
    params.set("apikey", key);
    return `${paidBase}?${params}`;
  }
  return `${freeBase}?${params}`;
}

function weatherSource(retrievedAt: string): SourceRef {
  return {
    name: "Open-Meteo forecast",
    sourceName: "Open-Meteo (weather data by Open-Meteo.com, CC-BY 4.0)",
    sourceType: "live-context",
    level: 4,
    url: "https://open-meteo.com/",
    retrievedAt,
    supports: ["near-term frost / low-temperature planting timing only"],
    confidence: "good",
    cacheStatus: "fresh",
    sourceQuality: "Official sources",
    needsLocalVerification: true,
  };
}

/**
 * Resolve a query to coordinates via Open-Meteo geocoding. A region id (e.g. "gta-ontario") is
 * mapped to its human label first so it geocodes; freeform text ("Oakville, ON") is used as-is.
 * Cached 30d (locations don't move). Null when nothing matches → caller falls back to the mock.
 */
async function geocode(query: string, signal: AbortSignal): Promise<GeocodeResult | null> {
  const region = getRegion(query);
  const term = region?.label ?? query;
  const key = `geocode:${term.toLowerCase()}`;
  const cached = getCached<GeocodeResult>(key);
  if (cached) return cached.value;

  const params = new URLSearchParams({ name: term, count: "1", language: "en", format: "json" });
  const res = await fetch(openMeteoUrl(GEO_FREE, GEO_PAID, params), { signal });
  if (!res.ok) return null;
  const parsed = GeoResponse.safeParse(await res.json());
  const hit = parsed.success ? parsed.data.results?.[0] : undefined;
  if (!hit) return null;
  const value: GeocodeResult = {
    query,
    label: [hit.name, hit.admin1].filter(Boolean).join(", "),
    lat: hit.latitude,
    lon: hit.longitude,
  };
  return setCached(key, value, getCachePolicy("geocode"), weatherSource(new Date().toISOString()))
    .value;
}

/** Turn the next-2-weeks daily lows into one honest, plain-language planting-timing sentence. */
export function summarize(time: string[], lows: number[]): string {
  if (lows.length === 0) return "No near-term forecast available; use Bloomprint's regional planting window.";
  const minLow = Math.round(Math.min(...lows));
  const frostIdx = lows.findIndex((t) => t <= FROST_C);
  if (frostIdx >= 0) {
    const when = time[frostIdx];
    return `Next ${FORECAST_DAYS} days: lows reach about ${minLow}°C — possible frost around ${when}. Hold tender or frost-sensitive plantings until the cold passes.`;
  }
  return `Next ${FORECAST_DAYS} days: lows around ${minLow}°C with no frost forecast — a workable planting stretch once soil is dry enough.`;
}

export async function getWeatherContext(
  query: string,
): Promise<CachedLiveData<WeatherContext> | null> {
  const key = `weather:${query.toLowerCase()}`;
  const cached = getCached<WeatherContext>(key);
  if (cached) return cached;
  if (process.env.LIVE_DATA_PROVIDER !== "open-meteo") return mockWeather(query);

  // Live path: geocode → forecast → near-term frost read. One controller/timeout across both
  // calls bounds total latency; any failure degrades to the mock so the plan never blocks.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const place = await geocode(query, controller.signal);
    if (!place) return mockWeather(query);

    const params = new URLSearchParams({
      latitude: String(place.lat),
      longitude: String(place.lon),
      daily: "temperature_2m_min",
      forecast_days: String(FORECAST_DAYS),
      timezone: "auto",
    });
    const res = await fetch(openMeteoUrl(FORECAST_FREE, FORECAST_PAID, params), {
      signal: controller.signal,
    });
    if (!res.ok) return mockWeather(query);
    const parsed = ForecastResponse.safeParse(await res.json());
    if (!parsed.success) return mockWeather(query);

    const retrievedAt = new Date().toISOString();
    return setCached(
      key,
      {
        locationLabel: place.label,
        summary: summarize(parsed.data.daily.time, parsed.data.daily.temperature_2m_min),
        retrievedAt,
      },
      getCachePolicy("weather"),
      weatherSource(retrievedAt),
    );
  } catch {
    return mockWeather(query);
  } finally {
    clearTimeout(timeout);
  }
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
