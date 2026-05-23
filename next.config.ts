import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Content-Security-Policy in REPORT-ONLY mode: it never blocks anything (so it can't
// break the next-themes inline script, konva/tfjs, or CDN-loaded transformers), it only
// surfaces would-be violations. Flip the header name to "Content-Security-Policy" to
// enforce — but only after a browser-console pass confirms no legit resource is blocked.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' for the next-themes anti-flash script; eval/wasm for tfjs; CDNs for analytics + transformers.js
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://va.vercel-scripts.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Supabase, weather/GBIF/geocode APIs, model + transformers CDNs, vercel insights.
  "connect-src 'self' https: blob: data:",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Smaller client bundles: only pull the icons/charts actually used.
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "@dnd-kit/core", "fuse.js"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
