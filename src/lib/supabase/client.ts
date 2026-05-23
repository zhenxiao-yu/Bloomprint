/**
 * Supabase browser client — created lazily, only when both public env vars exist.
 *
 * The whole cloud layer is optional (docs/DECISIONS.md D12): when these vars are absent the app
 * stays fully local-first and `getSupabaseBrowserClient()` returns null. Uses @supabase/ssr's
 * cookie-based client so the session is shared with the server (middleware refresh + RSC reads).
 * RLS protects every row and the publishable key is browser-safe.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase's newer "publishable" key naming; fall back to the classic anon key for compatibility.
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when the public env vars are present — the only signal the UI uses to offer cloud sync. */
export function isSupabaseConfigured(): boolean {
  return Boolean(URL && KEY);
}

let client: SupabaseClient<Database> | null = null;

/**
 * The shared browser client, or null when Supabase is not configured. Singleton so the auth
 * session (cookie-based via @supabase/ssr) is shared across the app and with the server.
 */
export function getSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!URL || !KEY) return null;
  if (typeof window === "undefined") return null;
  if (!client) {
    client = createBrowserClient<Database>(URL, KEY);
  }
  return client;
}
