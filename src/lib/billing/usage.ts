/**
 * Server-side entitlement enforcement via the `check_and_increment_usage` RPC.
 * Atomic against usage_counters (only the definer function / service role may write it), keyed on
 * the caller's auth.uid(). Returns true when the action is allowed (usage stayed within `limit`).
 *
 * The LIMIT comes from the billing layer (entitlements per plan) — this only enforces it. Call from
 * a route handler before a metered action (e.g. an AI refinement). Server-only (uses cookies).
 */
import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/serverClient";

/** Month bucket like "2026-05" for monthly quotas. */
export function currentPeriodKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function checkAndIncrementUsage(
  metric: string,
  limit: number,
  period: string = currentPeriodKey(),
): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("check_and_increment_usage", {
    p_metric: metric,
    p_period: period,
    p_limit: limit,
  });
  return !error && data === true;
}
