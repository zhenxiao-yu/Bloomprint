import type { CachePolicy, LiveDataKind } from "@/lib/live-data/types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const LIVE_DATA_CACHE_POLICY: Record<LiveDataKind, CachePolicy> = {
  weather: { ttlMs: 6 * HOUR },
  geocode: { ttlMs: 30 * DAY },
  gbif: { ttlMs: 30 * DAY },
  "store-search": { ttlMs: 7 * DAY },
  "source-snapshot": { ttlMs: 30 * DAY },
};

export function getCachePolicy(kind: LiveDataKind): CachePolicy {
  return LIVE_DATA_CACHE_POLICY[kind];
}
