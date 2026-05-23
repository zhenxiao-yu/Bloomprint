import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 "proxy" convention (formerly middleware). next-intl handles
// locale negotiation and prefixing here.
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals, the extensionless metadata routes
  // (opengraph-image / icon / etc.), and anything with a file extension.
  matcher: ["/((?!api|_next|_vercel|opengraph-image|twitter-image|icon|apple-icon|.*\\..*).*)"],
};
