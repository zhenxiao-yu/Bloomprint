import type { MetadataRoute } from "next";
import { SITE_NAME, BRAND_THEME_COLOR, BRAND_BG_LIGHT } from "@/lib/siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${SITE_NAME} — realistic yard planning workspace`,
    short_name: SITE_NAME,
    description: "Turn your yard goal into a buildable plan: plants, materials, budget, and steps.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: BRAND_BG_LIGHT,
    theme_color: BRAND_THEME_COLOR,
    orientation: "portrait-primary",
    categories: ["productivity", "utilities", "lifestyle"],
    icons: [
      { src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/maskable-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/icon", sizes: "32x32", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "New yard plan",
        short_name: "Plan",
        url: "/plan",
        description: "Start a photo-first yard plan",
      },
      {
        name: "Dashboard",
        short_name: "Dashboard",
        url: "/dashboard",
        description: "Resume saved projects",
      },
      {
        name: "Saved plans",
        short_name: "Saved",
        url: "/plans",
        description: "Open saved yard plans",
      },
    ],
  };
}
