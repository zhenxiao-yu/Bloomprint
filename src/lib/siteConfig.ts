import { routing } from "@/i18n/routing";

/** Canonical site origin. Override per environment via NEXT_PUBLIC_APP_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://bloomprint.vercel.app").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "Bloomprint";

/** Brand colors for manifest / theme-color (light + dark backgrounds). */
export const BRAND_THEME_COLOR = "#244735";
export const BRAND_BG_LIGHT = "#f8f3ea";
export const BRAND_BG_DARK = "#0e1511";

/** Public, indexable routes (locale prefix added per locale). Keep in sync with app/. */
export const PUBLIC_ROUTES = ["", "/plan", "/plans", "/pricing", "/guide", "/about"] as const;

/** Build a locale-prefixed path. Default locale ("en") stays unprefixed (localePrefix: as-needed). */
export function localizedPath(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${prefix}${path}` || "/";
}
