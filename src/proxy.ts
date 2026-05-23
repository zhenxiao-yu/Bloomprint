import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSupabaseSession } from "./lib/supabase/serverClient";

// Next.js 16 "proxy" convention (formerly middleware). We compose two concerns:
//   1) next-intl locale negotiation / prefixing (produces the response), then
//   2) Supabase session refresh, which writes rotated auth cookies onto that SAME response.
// Supabase is optional — refreshSupabaseSession is a no-op when env vars are absent.
const handleI18n = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  return refreshSupabaseSession(request, response);
}

export const config = {
  // Skip API + auth route handlers, Next internals, the extensionless metadata routes, and files.
  matcher: ["/((?!api|auth|_next|_vercel|opengraph-image|twitter-image|icon|apple-icon|.*\\..*).*)"],
};
