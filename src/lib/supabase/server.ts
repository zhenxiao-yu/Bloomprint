/**
 * Supabase service-role client — SERVER ONLY.
 *
 * Uses the service-role key, which bypasses RLS, so it must never reach the browser. The only
 * caller today is the optional AI prompt cache (server-side). Returns null when the key is absent,
 * so callers degrade to "no cache" rather than failing (docs/DECISIONS.md D11).
 *
 * There is a hard runtime guard below: importing this in a client bundle throws immediately.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient<Database> | null = null;

/** Whether the service-role key is configured (gates the server-side AI cache). */
export function isServiceRoleConfigured(): boolean {
  return Boolean(URL && SERVICE_KEY);
}

/**
 * The service-role client, or null when not configured. Throws if ever invoked in the browser —
 * a defensive backstop so the privileged key can never be used client-side.
 */
export function getSupabaseServiceClient(): SupabaseClient<Database> | null {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseServiceClient() must never be called in the browser.");
  }
  if (!URL || !SERVICE_KEY) return null;
  if (!client) {
    client = createClient<Database>(URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
