/**
 * Minimal in-memory TTL cache used to dedupe paid AI calls (vision by image
 * hash, render by prompt) so repeated/identical requests don't re-bill. Bounded
 * by `maxEntries` (oldest evicted first). `now` is injectable for tests.
 *
 * Keep TTLs shorter than any upstream URL expiry (e.g. SiliconFlow image URLs
 * last ~1h) so a cached value is never a dead link.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class TtlCache<T> {
  private readonly map = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 200,
  ) {}

  get(key: string, now: number = Date.now()): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (now >= e.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return e.value;
  }

  set(key: string, value: T, now: number = Date.now()): void {
    if (!this.map.has(key) && this.map.size >= this.maxEntries) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, { value, expiresAt: now + this.ttlMs });
  }
}
