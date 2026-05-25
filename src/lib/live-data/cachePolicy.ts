import type { CachePolicy, LiveDataKind } from "@/lib/live-data/types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const LIVE_DATA_CACHE_POLICY: Record<LiveDataKind, CachePolicy> = {
  weather: { ttlMs: 6 * HOUR },
  geocode: { ttlMs: 30 * DAY },
  gbif: { ttlMs: 30 * DAY },
  "store-search": { ttlMs: 7 * DAY },
  "source-snapshot": { ttlMs: 30 * DAY },
  // Retailer prices move fastest; plant facts and invasive context are stable.
  "retailer-products": { ttlMs: 12 * HOUR },
  "plant-facts": { ttlMs: 60 * DAY },
  invasive: { ttlMs: 30 * DAY },
  // Hardiness zones change only when USDA re-issues the map (years apart).
  hardiness: { ttlMs: 30 * DAY },
};

export function getCachePolicy(kind: LiveDataKind): CachePolicy {
  return LIVE_DATA_CACHE_POLICY[kind];
}
