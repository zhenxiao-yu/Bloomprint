"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Clock,
  FileText,
  Home,
  Images,
  Info,
  Sparkles,
  Store,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSavedPlans } from "@/lib/plansStore";
import { loadPlanningDraft, type PlanningDraftSnapshot } from "@/lib/workspace/draftStore";
import { Photo } from "@/components/ui/photo";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type StatTone = "brand" | "trust" | "accent" | "blueprint";

type NumericStat = {
  kind: "number";
  key: string;
  label: string;
  hint: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone: StatTone;
};
type TextStat = {
  kind: "text";
  key: string;
  label: string;
  hint: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: StatTone;
};
type Stat = NumericStat | TextStat;

const TONE_CHIP: Record<StatTone, string> = {
  brand: "bg-brand-soft text-brand-strong",
  trust: "bg-[var(--trust)]/15 text-[var(--trust)]",
  accent: "bg-[var(--accent)]/15 text-[var(--accent)]",
  blueprint: "bg-[var(--blueprint)]/15 text-[var(--blueprint)]",
};

export function DashboardWorkspace() {
  const t = useTranslations("Dashboard");
  const plans = useSavedPlans();
  const [draft] = useState<PlanningDraftSnapshot | null>(() =>
    typeof window === "undefined" ? null : loadPlanningDraft(),
  );

  const isPro = draft?.session.projectKind === "client_property";

  const stats = useMemo<Stat[]>(
    () => [
      {
        kind: "number",
        key: "active",
        label: t("statActive"),
        hint: t("statActiveHint"),
        value: plans.length,
        icon: FileText,
        tone: "brand",
      },
      {
        kind: "number",
        key: "photos",
        label: t("statPhotos"),
        hint: t("statPhotosHint"),
        value: draft?.photos.length ?? 0,
        icon: Images,
        tone: "accent",
      },
      {
        kind: "number",
        key: "compare",
        label: t("statCompare"),
        hint: t("statCompareHint"),
        value: Math.max(0, plans.length - 1),
        icon: Clock,
        tone: "trust",
      },
      {
        kind: "text",
        key: "mode",
        label: t("statMode"),
        hint: t("statModeHint"),
        value: isPro ? t("modePro") : t("modeHome"),
        icon: Home,
        tone: "blueprint",
      },
    ],
    [draft, plans.length, isPro, t],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-4 py-8 sm:px-6 sm:py-12">
      <BlurFade inView>
        <Photo
          src="/photos/house-exterior.jpg"
          alt={t("heroAlt")}
          priority
          scrim
          sizes="(max-width: 1152px) 100vw, 1152px"
          className="relative flex min-h-72 rounded-3xl ring-1 ring-foreground/10"
        >
          <BorderBeam
            size={140}
            duration={9}
            colorFrom="var(--brand)"
            colorTo="var(--accent)"
            className="opacity-70"
          />
          <header className="mt-auto grid gap-5 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                <Sparkles className="size-3.5" aria-hidden />
                {t("eyebrow")}
              </span>
              <h1 className="display-lg mt-3 max-w-2xl text-white drop-shadow-sm">
                {t("title")}
              </h1>
              <p className="lead mt-3 max-w-2xl text-white/85">{t("subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="rounded-full bg-brand text-on-strong hover:bg-brand-strong">
                <Link href="/plan">
                  {t("ctaNew")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="glass-chip rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                <Link href="/pro">{t("ctaPro")}</Link>
              </Button>
            </div>
          </header>
        </Photo>
      </BlurFade>

      <section
        aria-label={t("statsAria")}
        className="grid gap-3 grid-cols-2 lg:grid-cols-4"
      >
        {stats.map((stat, i) => (
          <BlurFade key={stat.key} inView delay={0.05 * i}>
            <StatCard stat={stat} />
          </BlurFade>
        ))}
      </section>

      {draft ? (
        <BlurFade inView>
          <div className="relative overflow-hidden rounded-2xl border border-brand/25 bg-brand-soft p-5 sm:p-6">
            <BorderBeam
              size={120}
              duration={7}
              colorFrom="var(--brand)"
              colorTo="var(--brand-strong)"
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="title-3 text-brand-strong">{t("resumeTitle")}</p>
                <p className="mt-1 text-sm text-brand-strong/85">
                  {t("resumeMeta", {
                    photos: draft.photos.length,
                    zones: draft.analysis?.zones.length ?? 0,
                    when: new Date(draft.session.updatedAt).toLocaleString(),
                  })}
                </p>
              </div>
              <Button
                asChild
                className="shrink-0 rounded-full bg-brand text-on-strong hover:bg-brand-strong"
              >
                <Link href="/plan">
                  {t("resumeCta")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </BlurFade>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <BlurFade inView className="flex">
          <div className="card hover-lift flex w-full flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="title-2 text-foreground">{t("recentTitle")}</h2>
              <Link
                href="/plans"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-strong"
              >
                {t("recentOpenAll")}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <div className="mt-4 flex flex-1 flex-col gap-3">
              {plans.length > 0 ? (
                plans.slice(0, 5).map((plan) => (
                  <Link
                    key={plan.id}
                    href={`/projects/${plan.id}`}
                    className="group/row hover-sheen rounded-xl border border-border p-3 transition hover:border-brand"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold capitalize text-foreground">
                        {plan.label}
                      </p>
                      <ArrowRight className="size-4 shrink-0 text-muted transition group-hover/row:translate-x-0.5 group-hover/row:text-brand" aria-hidden />
                    </div>
                    <p className="numeric mt-1 text-xs text-muted">
                      {plan.summary.versionLabel ?? t("draftDefault")} · $
                      {plan.summary.diyMin.toLocaleString()}–$
                      {plan.summary.diyMax.toLocaleString()} ·{" "}
                      {t("confidenceSuffix", { confidence: plan.summary.confidence })}
                    </p>
                  </Link>
                ))
              ) : (
                <EmptyRecent t={t} />
              )}
            </div>
          </div>
        </BlurFade>

        <BlurFade inView delay={0.08} className="flex">
          <div className="card hover-lift flex w-full flex-col p-5 sm:p-6">
            <h2 className="title-2 text-foreground">{t("modesTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("modesSubtitle")}</p>
            <div className="mt-4 flex flex-1 flex-col gap-3">
              <ModeLink
                icon={Home}
                href="/plan"
                title={t("modeHomeownerTitle")}
                body={t("modeHomeownerBody")}
              />
              <ModeLink
                icon={BriefcaseBusiness}
                href="/pro"
                title={t("modeProTitle")}
                body={t("modeProBody")}
              />
              <ModeLink
                icon={Store}
                href="/plan?mode=staff"
                title={t("modeStoreTitle")}
                body={t("modeStoreBody")}
              />
            </div>
          </div>
        </BlurFade>
      </section>
    </main>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const { label, hint, icon: Icon, tone } = stat;
  return (
    <MagicCard className="card hover-lift h-full rounded-xl" gradientOpacity={0.12}>
      <div className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <span
            className={`flex size-9 items-center justify-center rounded-full ${TONE_CHIP[tone]}`}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <Tooltip>
            <TooltipTrigger
              className="-m-2 rounded-full p-2 text-muted transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={hint}
            >
              <Info className="size-4" aria-hidden />
            </TooltipTrigger>
            <TooltipContent className="max-w-56">{hint}</TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </p>
        {stat.kind === "number" ? (
          <NumberTicker
            value={stat.value}
            className="numeric mt-1 text-3xl font-semibold !text-foreground"
          />
        ) : (
          <p className="numeric mt-1 text-3xl font-semibold text-foreground">{stat.value}</p>
        )}
      </div>
    </MagicCard>
  );
}

function EmptyRecent({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Sparkles className="size-6" aria-hidden />
      </span>
      <div>
        <p className="title-3 text-foreground">{t("recentEmptyTitle")}</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{t("recentEmptyBody")}</p>
      </div>
      <Button asChild className="rounded-full bg-brand text-on-strong hover:bg-brand-strong">
        <Link href="/plan">
          {t("recentEmptyCta")}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

function ModeLink({
  icon: Icon,
  href,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string }>;
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group/mode hover-sheen flex items-center gap-3 rounded-xl border border-border p-3 transition hover:border-brand"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{body}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted transition group-hover/mode:translate-x-0.5 group-hover/mode:text-brand" aria-hidden />
    </Link>
  );
}
