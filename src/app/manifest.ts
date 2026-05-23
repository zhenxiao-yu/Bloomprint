import type { MetadataRoute } from "next";
import { SITE_NAME, BRAND_THEME_COLOR, BRAND_BG_LIGHT } from "@/lib/siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — buildable yard plans`,
    short_name: SITE_NAME,
    description: "Turn your yard goal into a buildable plan: plants, materials, budget, and steps.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND_BG_LIGHT,
    theme_color: BRAND_THEME_COLOR,
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
