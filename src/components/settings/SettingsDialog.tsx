"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Database,
  Download,
  Eye,
  Gauge,
  Languages,
  Monitor,
  Moon,
  Palette,
  Ruler,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Type,
} from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  recordConsent,
  resetPreferences,
  setPreferences,
  usePreferences,
  type Currency,
  type FontScale,
  type Units,
} from "@/lib/preferencesStore";
import {
  clearAllLocalData,
  downloadDataExport,
  localDataSizeBytes,
} from "@/lib/localData";
import { useNotificationPrefs, type NotificationPrefs } from "@/lib/notificationPrefs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { BorderBeam } from "@/components/ui/border-beam";

type SectionId = "appearance" | "language" | "units" | "notifications" | "privacy";

const FONT_ORDER: FontScale[] = ["compact", "default", "comfortable", "large"];
const THEME_ORDER = ["light", "dark", "system"] as const;

export function SettingsDialog({ children }: { children: React.ReactNode }) {
  const t = useTranslations("SettingsModal");
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SectionId>("appearance");

  const SECTIONS: { id: SectionId; icon: typeof Palette }[] = [
    { id: "appearance", icon: Palette },
    { id: "language", icon: Languages },
    { id: "units", icon: Ruler },
    { id: "notifications", icon: Bell },
    { id: "privacy", icon: ShieldCheck },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton
        className="top-auto bottom-0 flex max-h-[90dvh] w-full max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden rounded-t-3xl rounded-b-none border-border bg-surface/95 p-0 backdrop-blur-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:top-1/2 sm:bottom-auto sm:max-h-[85vh] sm:min-h-[22rem] sm:-translate-y-1/2 sm:rounded-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <BorderBeam size={120} duration={8} borderWidth={1.2} className="opacity-50" />

        <DialogHeader className="relative gap-1 border-b border-border/70 px-5 pt-4 pb-3 text-left sm:px-6">
          <span aria-hidden className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-border sm:hidden" />
          <DialogTitle className="title-3 flex items-center gap-2 text-lg">
            <Sparkles className="size-4 text-brand" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted">{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* Section nav — horizontal pills on mobile, vertical rail on desktop. */}
          <nav
            aria-label={t("title")}
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-border/70 px-3 py-2 sm:w-52 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:px-2 sm:py-3"
          >
            {SECTIONS.map(({ id, icon: Icon }) => {
              const active = section === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSection(id)}
                  aria-current={active ? "true" : undefined}
                  className={`group relative flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                    active ? "text-brand-strong" : "text-muted hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-section-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 -z-10 rounded-xl bg-brand-soft"
                    />
                  )}
                  <Icon className="size-4" aria-hidden />
                  {t(`section_${id}`)}
                </button>
              );
            })}
          </nav>

          {/* Scrollable section body. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                {section === "appearance" && <AppearanceSection />}
                {section === "language" && <LanguageSection onSwitch={() => setOpen(false)} />}
                {section === "units" && <UnitsSection />}
                {section === "notifications" && <NotificationsSection />}
                {section === "privacy" && <PrivacySection />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- shared building blocks ----------------------------- */

function Row({
  icon: Icon,
  title,
  description,
  control,
  htmlFor,
}: {
  icon?: typeof Bell;
  title: string;
  description?: string;
  control: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 rounded-2xl border border-border bg-background/50 px-3.5 py-3">
      <label htmlFor={htmlFor} className="min-w-0 flex-1 basis-40 cursor-pointer">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icon && <Icon className="size-4 shrink-0 text-brand" aria-hidden />}
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
        )}
      </label>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: typeof Sun }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  const groupId = useId();
  return (
    <div role="group" aria-label={ariaLabel} className="flex rounded-full border border-border p-0.5">
      {options.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`relative inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
              active ? "text-on-strong" : "text-muted hover:text-foreground"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${groupId}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-full bg-brand"
              />
            )}
            {Icon && <Icon className="size-4" aria-hidden />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="eyebrow mb-2 text-muted">{children}</h3>;
}

/* --------------------------------- Appearance --------------------------------- */

function AppearanceSection() {
  const t = useTranslations("SettingsModal");
  const tTheme = useTranslations("Theme");
  const prefs = usePreferences();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const currentTheme =
    mounted && THEME_ORDER.includes(theme as (typeof THEME_ORDER)[number])
      ? (theme as (typeof THEME_ORDER)[number])
      : "system";
  const fontIndex = Math.max(0, FONT_ORDER.indexOf(prefs.fontScale));

  return (
    <div className="space-y-3">
      <SectionTitle>{t("section_appearance")}</SectionTitle>

      <Row
        icon={Palette}
        title={tTheme("appearance")}
        control={
          <Segmented
            ariaLabel={tTheme("appearance")}
            value={currentTheme}
            onChange={(v) => setTheme(v)}
            options={[
              { value: "light", label: tTheme("light"), icon: Sun },
              { value: "dark", label: tTheme("dark"), icon: Moon },
              { value: "system", label: tTheme("system"), icon: Monitor },
            ]}
          />
        }
      />

      {/* Font size slider with live preview. */}
      <div className="rounded-2xl border border-border bg-background/50 px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Type className="size-4 text-brand" aria-hidden />
            {t("fontSize")}
          </span>
          <span className="text-xs font-medium text-muted">{t(`font_${prefs.fontScale}`)}</span>
        </div>
        <Slider
          className="mt-3"
          min={0}
          max={3}
          step={1}
          value={[fontIndex]}
          onValueChange={([v]) => setPreferences({ fontScale: FONT_ORDER[v] ?? "default" })}
          aria-label={t("fontSize")}
        />
        <p className="mt-2 truncate text-muted" aria-hidden>
          {t("fontPreview")}
        </p>
      </div>

      <Row
        icon={Gauge}
        title={t("reduceMotion")}
        description={t("reduceMotionBody")}
        htmlFor="pref-reduce-motion"
        control={
          <Switch
            id="pref-reduce-motion"
            checked={prefs.reduceMotion}
            onCheckedChange={(v) => setPreferences({ reduceMotion: v })}
          />
        }
      />
      <Row
        icon={Eye}
        title={t("highContrast")}
        description={t("highContrastBody")}
        htmlFor="pref-high-contrast"
        control={
          <Switch
            id="pref-high-contrast"
            checked={prefs.highContrast}
            onCheckedChange={(v) => setPreferences({ highContrast: v })}
          />
        }
      />
      <Row
        icon={Ruler}
        title={t("largeTapTargets")}
        description={t("largeTapTargetsBody")}
        htmlFor="pref-large-tap"
        control={
          <Switch
            id="pref-large-tap"
            checked={prefs.largeTapTargets}
            onCheckedChange={(v) => setPreferences({ largeTapTargets: v })}
          />
        }
      />
    </div>
  );
}

/* ---------------------------------- Language ---------------------------------- */

function LanguageSection({ onSwitch }: { onSwitch: () => void }) {
  const t = useTranslations("SettingsModal");
  const tLang = useTranslations("Language");
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  function switchTo(target: string) {
    if (target === locale) return;
    onSwitch();
    router.replace(
      // @ts-expect-error -- pathname + params is the documented next-intl pattern
      { pathname, params },
      { locale: target },
    );
  }

  return (
    <div className="space-y-3">
      <SectionTitle>{t("section_language")}</SectionTitle>
      <Row
        icon={Languages}
        title={tLang("label")}
        description={t("languageBody")}
        control={
          <Segmented
            ariaLabel={tLang("label")}
            value={locale}
            onChange={switchTo}
            options={routing.locales.map((loc) => ({ value: loc, label: tLang(loc) }))}
          />
        }
      />
    </div>
  );
}

/* ----------------------------------- Units ------------------------------------ */

function UnitsSection() {
  const t = useTranslations("SettingsModal");
  const prefs = usePreferences();

  return (
    <div className="space-y-3">
      <SectionTitle>{t("section_units")}</SectionTitle>
      <Row
        icon={Ruler}
        title={t("units")}
        description={t("unitsBody")}
        control={
          <Segmented<Units>
            ariaLabel={t("units")}
            value={prefs.units}
            onChange={(v) => setPreferences({ units: v })}
            options={[
              { value: "imperial", label: t("imperial") },
              { value: "metric", label: t("metric") },
            ]}
          />
        }
      />
      <Row
        icon={Database}
        title={t("currency")}
        description={t("currencyBody")}
        control={
          <Segmented<Currency>
            ariaLabel={t("currency")}
            value={prefs.currency}
            onChange={(v) => setPreferences({ currency: v })}
            options={[
              { value: "USD", label: "USD $" },
              { value: "CAD", label: "CAD $" },
            ]}
          />
        }
      />
    </div>
  );
}

/* ------------------------------- Notifications -------------------------------- */

function NotificationsSection() {
  const t = useTranslations("SettingsModal");
  const tS = useTranslations("Settings");
  const { prefs, update } = useNotificationPrefs();
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  useEffect(() => {
    const id = window.setTimeout(
      () => setPermission("Notification" in window ? Notification.permission : "unsupported"),
      0,
    );
    return () => window.clearTimeout(id);
  }, []);

  async function requestNotifications() {
    if (!("Notification" in window)) return setPermission("unsupported");
    setPermission(await Notification.requestPermission());
  }

  const toggles: { key: keyof NotificationPrefs; title: string; body: string }[] = [
    { key: "draftRecovery", title: tS("draftRecovery"), body: tS("draftRecoveryBody") },
    { key: "careReminders", title: tS("careReminders"), body: tS("careRemindersBody") },
    { key: "storePrep", title: tS("storePrep"), body: tS("storePrepBody") },
    { key: "quietHours", title: tS("quietHours"), body: tS("quietHoursBody") },
  ];

  return (
    <div className="space-y-3">
      <SectionTitle>{t("section_notifications")}</SectionTitle>
      <p className="text-xs leading-relaxed text-muted">{tS("notificationsBody")}</p>
      {toggles.map(({ key, title, body }) => (
        <Row
          key={key}
          title={title}
          description={body}
          htmlFor={`pref-notif-${key}`}
          control={
            <Switch
              id={`pref-notif-${key}`}
              checked={prefs[key] as boolean}
              onCheckedChange={(v) => update({ [key]: v })}
            />
          }
        />
      ))}
      <Row
        title={tS("cadenceLabel")}
        control={
          <Segmented<NotificationPrefs["cadence"]>
            ariaLabel={tS("cadenceLabel")}
            value={prefs.cadence}
            onChange={(v) => update({ cadence: v })}
            options={[
              { value: "smart", label: tS("cadenceSmart") },
              { value: "weekly", label: tS("cadenceWeekly") },
              { value: "important", label: tS("cadenceImportant") },
            ]}
          />
        }
      />
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={requestNotifications}
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong transition active:scale-95"
        >
          {permission === "granted" ? tS("notificationsGranted") : tS("enableNotifications")}
        </button>
        <span className="text-xs text-muted">
          {permission === "unsupported"
            ? tS("notificationsUnsupported")
            : permission === "denied"
              ? tS("notificationsDenied")
              : tS("notificationsLocal")}
        </span>
      </div>
    </div>
  );
}

/* --------------------------------- Privacy ------------------------------------ */

function PrivacySection() {
  const t = useTranslations("SettingsModal");
  const prefs = usePreferences();
  const [sizeKb, setSizeKb] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setSizeKb(Math.round(localDataSizeBytes() / 1024)), 0);
    return () => window.clearTimeout(id);
  }, []);

  function clearData() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    clearAllLocalData();
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <SectionTitle>{t("section_privacy")}</SectionTitle>

      <Row
        icon={ShieldCheck}
        title={t("consentTitle")}
        description={t("consentBody")}
        control={
          <Segmented
            ariaLabel={t("consentTitle")}
            value={prefs.consent ?? "essential"}
            onChange={(v) => recordConsent(v as "all" | "essential")}
            options={[
              { value: "all", label: t("consentAll") },
              { value: "essential", label: t("consentEssential") },
            ]}
          />
        }
      />
      <Row
        icon={Gauge}
        title={t("analytics")}
        description={t("analyticsBody")}
        htmlFor="pref-analytics"
        control={
          <Switch
            id="pref-analytics"
            checked={prefs.analytics}
            onCheckedChange={(v) => setPreferences({ analytics: v })}
          />
        }
      />

      <button
        type="button"
        onClick={downloadDataExport}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/50 px-3.5 py-3 text-left transition hover:border-brand active:scale-[0.99]"
      >
        <Download className="size-4 shrink-0 text-brand" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{t("exportData")}</span>
          <span className="mt-0.5 block text-xs text-muted">
            {t("exportDataBody")}
            {sizeKb !== null ? ` · ${t("storageUsed", { kb: sizeKb })}` : ""}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={clearData}
        className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.99] ${
          confirming
            ? "border-danger bg-danger/10"
            : "border-border bg-background/50 hover:border-danger"
        }`}
      >
        <Trash2 className="size-4 shrink-0 text-danger" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-danger">
            {confirming ? t("clearConfirm") : t("clearData")}
          </span>
          <span className="mt-0.5 block text-xs text-muted">{t("clearDataBody")}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => resetPreferences()}
        className="mt-1 text-xs font-medium text-muted underline-offset-2 transition hover:text-foreground hover:underline"
      >
        {t("resetAll")}
      </button>

      <p className="pt-1 text-xs text-muted">{t("savedHint")}</p>
    </div>
  );
}
