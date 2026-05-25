"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const THEME_ORDER = ["light", "dark", "system"] as const;
type ThemeChoice = (typeof THEME_ORDER)[number];

const SEGMENT_BASE = "rounded-full px-3 py-1.5 text-sm transition";
const SEGMENT_ACTIVE = "bg-brand text-on-strong";
const SEGMENT_INACTIVE = "text-muted hover:text-foreground";

function segmentClass(active: boolean) {
  return `${SEGMENT_BASE} ${active ? SEGMENT_ACTIVE : SEGMENT_INACTIVE}`;
}

/**
 * Self-contained preferences card for /account/settings.
 * Theme (next-themes) and language (URL locale) are both device-local —
 * no account or Supabase dependency.
 */
export function PreferencesCard() {
  const t = useTranslations("Settings");
  const tTheme = useTranslations("Theme");
  const tLang = useTranslations("Language");

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mount gate prevents hydration mismatch (server can't know the resolved theme).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const currentTheme: ThemeChoice =
    mounted && THEME_ORDER.includes(theme as ThemeChoice) ? (theme as ThemeChoice) : "system";

  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  function switchLocale(next: (typeof routing.locales)[number]) {
    if (next === locale) return;
    router.replace(
      // @ts-expect-error -- pathname + params is the documented next-intl pattern
      { pathname, params },
      { locale: next },
    );
  }

  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("preferencesTitle")}</h2>

      <div className="mt-4 space-y-4">
        {/* Theme */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span id="prefs-theme-label" className="text-sm text-foreground">
            {t("themeLabel")}
          </span>
          <div
            role="group"
            aria-labelledby="prefs-theme-label"
            className="flex rounded-full border border-border p-0.5"
          >
            {THEME_ORDER.map((choice) => {
              const active = mounted && currentTheme === choice;
              return (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTheme(choice)}
                  className={segmentClass(active)}
                >
                  {tTheme(choice)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Language */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span id="prefs-language-label" className="text-sm text-foreground">
            {t("languageLabel")}
          </span>
          <div
            role="group"
            aria-labelledby="prefs-language-label"
            className="flex rounded-full border border-border p-0.5"
          >
            {routing.locales.map((loc) => {
              const active = locale === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  aria-pressed={active}
                  onClick={() => switchLocale(loc)}
                  className={segmentClass(active)}
                >
                  {tLang(loc)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-muted">{t("preferencesHint")}</p>
    </section>
  );
}
