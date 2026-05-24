"use client";

import { useEffect, useState } from "react";
import { Bell, Download, Moon, Smartphone, Wifi } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNotificationPrefs, type NotificationPrefs } from "@/lib/notificationPrefs";

function standaloneMode() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function AccountAppSettings() {
  const t = useTranslations("Settings");
  const { prefs, update } = useNotificationPrefs();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPermission("Notification" in window ? Notification.permission : "unsupported");
      setInstalled(standaloneMode());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function requestNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const next = await Notification.requestPermission();
    setPermission(next);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
      <section className="card p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-full bg-brand-soft p-2 text-brand">
            <Bell className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("notificationsTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("notificationsBody")}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <ToggleRow
            icon={Bell}
            title={t("draftRecovery")}
            description={t("draftRecoveryBody")}
            checked={prefs.draftRecovery}
            onChange={(value) => update({ draftRecovery: value })}
          />
          <ToggleRow
            icon={Smartphone}
            title={t("careReminders")}
            description={t("careRemindersBody")}
            checked={prefs.careReminders}
            onChange={(value) => update({ careReminders: value })}
          />
          <ToggleRow
            icon={Wifi}
            title={t("storePrep")}
            description={t("storePrepBody")}
            checked={prefs.storePrep}
            onChange={(value) => update({ storePrep: value })}
          />
          <ToggleRow
            icon={Moon}
            title={t("quietHours")}
            description={t("quietHoursBody")}
            checked={prefs.quietHours}
            onChange={(value) => update({ quietHours: value })}
          />
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-foreground">{t("cadenceLabel")}</span>
          <select
            value={prefs.cadence}
            onChange={(event) =>
              update({ cadence: event.target.value as NotificationPrefs["cadence"] })
            }
            className="card mt-1 w-full p-2.5 text-sm"
          >
            <option value="smart">{t("cadenceSmart")}</option>
            <option value="weekly">{t("cadenceWeekly")}</option>
            <option value="important">{t("cadenceImportant")}</option>
          </select>
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestNotifications}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong"
          >
            {permission === "granted" ? t("notificationsGranted") : t("enableNotifications")}
          </button>
          <span className="text-xs text-muted">
            {permission === "unsupported"
              ? t("notificationsUnsupported")
              : permission === "denied"
                ? t("notificationsDenied")
                : t("notificationsLocal")}
          </span>
        </div>
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

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-5 accent-[var(--brand)]"
      />
    </label>
  );
}
