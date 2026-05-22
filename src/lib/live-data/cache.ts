import type { CachedLiveData, CachePolicy } from "@/lib/live-data/types";

const memory = new Map<string, CachedLiveData<unknown>>();

export function getCached<T>(key: string): CachedLiveData<T> | null {
  const hit = memory.get(key) as CachedLiveData<T> | undefined;
  if (!hit) return null;
  const fresh = Date.parse(hit.expiresAt) > Date.now();
  return { ...hit, cacheStatus: fresh ? "fresh" : "stale" };
}

export function setCached<T>(
  key: string,
  value: T,
  policy: CachePolicy,
  source: CachedLiveData<T>["source"],
): CachedLiveData<T> {
  const retrieved = new Date();
  const entry: CachedLiveData<T> = {
    key,
    value,
    retrievedAt: retrieved.toISOString(),
    expiresAt: new Date(retrieved.getTime() + policy.ttlMs).toISOString(),
    cacheStatus: "fresh",
    source: { ...source, retrievedAt: retrieved.toISOString(), cacheStatus: "fresh" },
  };
  memory.set(key, entry as CachedLiveData<unknown>);
  return entry;
}
