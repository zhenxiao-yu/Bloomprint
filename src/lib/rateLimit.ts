/**
 * Tiny in-memory fixed-window rate limiter for the paid AI routes (plan / vision
 * / render). No external store (Redis) — keeps the "works with no infra" rule;
 * it's a per-process best-effort guard (on multi-instance serverless each
 * instance limits independently, which is still a meaningful anti-spam floor).
 *
 * `now` is injectable so the logic is deterministically unit-testable.
 */
export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic prune so the map can't grow unbounded under spray attacks.
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterSec: 0 };
}

/** Best-effort client IP from proxy headers; "local" when none (dev). */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "local";
  return request.headers.get("x-real-ip") ?? "local";
}

/** Test-only: clear all buckets. */
export function __resetRateLimit(): void {
  buckets.clear();
}
