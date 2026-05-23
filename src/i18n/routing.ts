import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh"],
  defaultLocale: "en",
  // English stays at "/", Chinese at "/zh" — keeps existing English URLs intact.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
