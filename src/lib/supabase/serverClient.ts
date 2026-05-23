/**
 * Cookie-based Supabase clients for the server (RSC, route handlers, middleware) via @supabase/ssr.
 * Optional like the rest of the cloud layer: returns null when env vars are absent. Uses the
 * publishable/anon key (RLS-protected) — NOT the service-role key (that stays in server.ts).
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Server client for RSC / route handlers (reads + writes the session cookies). */
export async function getSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  if (!URL || !KEY) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(URL, KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component (read-only cookies) — the middleware refreshes instead.
        }
      },
    },
  });
}

/**
 * Refresh the auth session inside middleware. Binds the Supabase client to the incoming request
 * cookies and the outgoing `response`, so rotated tokens are written back. Returns the same
 * response (its cookies must be the ones returned to the browser).
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!URL || !KEY) return response;
  const supabase = createServerClient<Database>(URL, KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Triggers a token refresh when needed; cookies are persisted via setAll above.
  await supabase.auth.getUser();
  return response;
}
