/**
 * One wrapper for every outbound third-party GET in the live-data layer.
 *
 * It exists to keep us comfortably inside free, key-free API tiers:
 *  - bounded timeout (never blocks the plan),
 *  - a polite identifying User-Agent (GBIF/OSM etc. ask for this),
 *  - Vercel's shared Data Cache via `next: { revalidate }` — a FREE, cross-instance
 *    cache, so the same query made by many users collapses to one upstream call.
 *
 * Total: returns null on any failure (timeout, non-2xx, parse) so callers degrade
 * to deterministic data and the plan never waits on the network.
 */
const USER_AGENT = "Bloomprint/1.0 (+https://bloomprint.vercel.app; buildable yard plans)";
const DEFAULT_TIMEOUT_MS = 8000;

export async function freeFetchJson(
  url: string,
  opts: { revalidateSeconds: number; timeoutMs?: number },
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      // Shared, free Vercel Data Cache — dedupes identical queries across users/instances.
      next: { revalidate: opts.revalidateSeconds },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
