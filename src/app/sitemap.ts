import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { PUBLIC_ROUTES, SITE_URL, localizedPath } from "@/lib/siteConfig";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${localizedPath(routing.defaultLocale, route)}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
    // hreflang alternates so search engines pair the en/zh variants.
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${SITE_URL}${localizedPath(locale, route)}`]),
      ),
    },
  }));
}
