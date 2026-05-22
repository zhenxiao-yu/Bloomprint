/**
 * Optional Supabase-backed caches — SERVER ONLY. All functions degrade to no-ops / nulls when the
 * service-role key is absent, so nothing here blocks the deterministic plan (docs/DECISIONS.md
 * D11). The AI prompt cache is intentionally service-role only (no client policies) because cached
 * entries may contain plan wording.
 */
import type { Json } from "@/types/supabase";
import { getSupabaseServiceClient, isServiceRoleConfigured } from "./server";

export { isServiceRoleConfigured };

/** Read a cached AI prompt result by key, or null on miss / unconfigured / error. */
export async function aiPromptCacheGet(key: string): Promise<Json | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("ai_prompt_cache").select("value").eq("key", key).maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

/** Best-effort write of an AI prompt result. Silent on failure. */
export async function aiPromptCacheSet(key: string, value: Json): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  try {
    await supabase.from("ai_prompt_cache").upsert({ key, value });
  } catch {
    /* non-blocking */
  }
}

export interface LiveCacheHit {
  value: Json;
  status: "fresh" | "stale";
}

/** Read a live-data cache entry, reporting fresh/stale. Null on miss / unconfigured / error. */
export async function liveDataCacheGet(key: string): Promise<LiveCacheHit | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from("live_data_cache")
      .select("value, expires_at")
      .eq("key", key)
      .maybeSingle();
    if (!data) return null;
    const fresh = Date.parse(data.expires_at) > Date.now();
    return { value: data.value, status: fresh ? "fresh" : "stale" };
  } catch {
    return null;
  }
}

/** Best-effort write of a live-data cache entry with an absolute expiry. Silent on failure. */
export async function liveDataCacheSet(
  key: string,
  value: Json,
  expiresAt: Date,
  source?: Json,
): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  try {
    await supabase.from("live_data_cache").upsert({
      key,
      value,
      source: source ?? null,
      retrieved_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  } catch {
    /* non-blocking */
  }
}
