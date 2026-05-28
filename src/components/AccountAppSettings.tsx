"use client";

import { useEffect, useState } from "react";
import { Download, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SettingsDialog } from "@/components/settings/SettingsDialog";

function standaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/**
 * "App" tab of /account/settings. Device/app preferences (theme, language, units,
 * notifications, privacy) all live in the shared Settings dialog — this is the single
 * pointer to it, so the account page no longer duplicates those controls. The install /
 * offline status below is unique to this surface.
 */
export function AccountAppSettings() {
  const t = useTranslations("Settings");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setInstalled(standaloneMode()), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="space-y-4">
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-brand-soft p-2 text-brand">
            <Settings2 className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{t("appSettingsTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("appSettingsBody")}</p>
          </div>
        </div>
        <SettingsDialog>
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
          >
            <Settings2 className="size-4" aria-hidden />
            {t("openAppSettings")}
          </button>
        </SettingsDialog>
      </section>

      <section className="card p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-brand-soft p-2 text-brand">
            <Download className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("appTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("appBody")}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
          <p className="text-sm font-semibold text-foreground">
            {installed ? t("installed") : t("installAvailable")}
          </p>
          <p className="mt-1 text-xs text-muted">{t("installHint")}</p>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
          <p className="text-sm font-semibold text-foreground">{t("offlineReady")}</p>
          <p className="mt-1 text-xs text-muted">{t("offlineReadyBody")}</p>
        </div>
      </section>
    </div>
  );
}
