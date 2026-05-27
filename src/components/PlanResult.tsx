"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { localizePlantName } from "@/lib/plantNames";
import { ArrowUp, HelpCircle, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { BloomprintPlan, RefinementAdjustment, ShoppingPriority } from "@/domain/models";
import { DRAINAGE_OPTIONS, REFINEMENTS, SOIL_OPTIONS, SUN_OPTIONS } from "@/lib/uiOptions";
import { Chip, Money, Section, SeverityTag } from "@/components/ui";
import { PlanCopilotDrawer, type CopilotSection } from "@/components/plan/PlanCopilotDrawer";
import { PlanSectionActions } from "@/components/plan/PlanSectionActions";
import { AssumptionBadge, ConfidenceBadge, VerificationBadge } from "@/components/plan/TrustBadges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberTicker } from "@/components/ui/number-ticker";
import { MagicCard } from "@/components/ui/magic-card";
import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import { motion } from "motion/react";
import { YardPreviewOverlay } from "@/components/yard-map/YardPreviewOverlay";
import { CommandBar } from "@/components/CommandBar";
import { ShoppingTable } from "@/components/ShoppingTable";
import { ImaginedView } from "@/components/ImaginedView";
import { ArView } from "@/components/ArView";
import { ReadinessMeter } from "@/components/ReadinessMeter";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { AlternativeOptions } from "@/components/AlternativeOptions";
import { FailurePointsCard } from "@/components/FailurePointsCard";
import { StoreRealityCheck } from "@/components/StoreRealityCheck";
import { trackEvent } from "@/lib/analytics";
import { stashYardPhoto } from "@/lib/yard-map/handoff";
import { LivePlanEnrichment } from "@/lib/live-data/schema";
import { LiveBadge } from "@/components/live/LiveBadge";

export type ViewMode = "simple" | "details" | "staff";

// Heavy, below-the-fold renderers are code-split so their libraries (@dnd-kit for the
// concept board, recharts for the charts) stay out of the initial plan bundle and load
// only when actually shown. Client-only (ssr:false) — they need the DOM.
const ConceptBoard = dynamic(
  () => import("@/components/ConceptBoard").then((m) => m.ConceptBoard),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full animate-pulse rounded-xl border border-dashed border-border bg-surface"
        style={{ aspectRatio: "5 / 3" }}
      />
    ),
  },
);
const PlanCharts = dynamic(
  () => import("@/components/PlanCharts").then((m) => m.PlanCharts),
  { ssr: false, loading: () => null },
);

const PLAN_LABEL_KEY: Record<string, "labelBuildable" | "labelConcept" | "labelNeedsVerification"> = {
  "buildable-estimate": "labelBuildable",
  "concept-placement": "labelConcept",
  "needs-local-verification": "labelNeedsVerification",
};

const PRIORITY_GROUPS: { key: ShoppingPriority; labelKey: "buyFirst" | "canWait" | "optionalUpgrades"; noteKey: "buyFirstNote" | "canWaitNote" | "optionalNote" }[] = [
  { key: "buy-first", labelKey: "buyFirst", noteKey: "buyFirstNote" },
  { key: "can-wait", labelKey: "canWait", noteKey: "canWaitNote" },
  { key: "optional", labelKey: "optionalUpgrades", noteKey: "optionalNote" },
];

type SiteField = "sun" | "soil" | "drainage";
const ACCURACY_CONTROLS: Record<SiteField, { value: string; label: string }[]> = {
  sun: SUN_OPTIONS,
  soil: SOIL_OPTIONS,
  drainage: DRAINAGE_OPTIONS,
};

/**
 * Honest helper: a small info affordance that explains a metric or domain term.
 * Presentation only — it never alters the value it sits beside.
 */
function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        aria-label={label}
        className="inline-flex size-5 items-center justify-center rounded-full text-muted/70 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <HelpCircle className="size-3.5" aria-hidden />
      </TooltipTrigger>
      <TooltipContent className="max-w-[15rem] leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

/** Metric pill with an inline honest helper on its label. Mirrors MetricPill's look. */
function MetricStat({
  label,
  tip,
  tone = "neutral",
  children,
}: {
  label: string;
  tip: string;
  tone?: "neutral" | "brand" | "warn";
  children: ReactNode;
}) {
  const tones = {
    neutral: "border-border bg-surface text-foreground",
    brand: "border-brand/25 bg-brand-soft text-brand-strong",
    warn: "border-warn/25 bg-warn/10 text-warn",
  };
  return (
    <span className={`flex min-h-11 flex-col justify-center rounded-lg border px-3 py-1.5 ${tones[tone]}`}>
      <span className="flex items-center gap-1 text-[0.68rem] font-medium uppercase tracking-wide opacity-75">
        {label}
        <InfoTip label={label}>{tip}</InfoTip>
      </span>
      <span className="numeric text-sm font-semibold">{children}</span>
    </span>
  );
}

/**
 * Animates the EXISTING money range — start/end values are taken verbatim from
 * the engine, only the count-up is presentational.
 */
function MoneyTicker({ value }: { value: { min: number; max: number } }) {
  return (
    <span className="tabular-nums">
      $<NumberTicker value={value.min} className="text-inherit tracking-normal text-foreground dark:text-foreground" />
      –$
      <NumberTicker value={value.max} className="text-inherit tracking-normal text-foreground dark:text-foreground" />
    </span>
  );
}

export function PlanResult({
  result,
  view,
  adjustments,
  busy,
  onRefine,
  onAccuracy,
  photoUrl = null,
}: {
  result: BloomprintPlan;
  view: ViewMode;
  adjustments: RefinementAdjustment[];
  busy: boolean;
  onRefine: (adjustment: RefinementAdjustment) => void;
  onAccuracy: (field: "sun" | "soil" | "drainage", value: string) => void;
  photoUrl?: string | null;
}) {
  const t = useTranslations("Result");
  const tr = useTranslations("Refinements");
  const to = useTranslations("Options");
  const locale = useLocale();
  const tLive = useTranslations("Live");
  const tCop = useTranslations("Copilot");
  const { plan } = result;
  const showNumbers = view !== "simple";
  const [boardView, setBoardView] = useState<"now" | "planned" | "overlay">("planned");
  const [arOpen, setArOpen] = useState(false);
  // Bounded section copilot (docs/DECISIONS.md D15) — explains a section, never mutates facts.
  const [copilot, setCopilot] = useState<CopilotSection | null>(null);
  const copilotRegion = plan.intake.locationQuery ?? plan.intake.regionId;
  function openCopilot(type: CopilotSection["type"], title: string, promptsKey: string) {
    const raw = tCop.has(promptsKey) ? (tCop.raw(promptsKey) as unknown) : [];
    setCopilot({ type, title, prompts: Array.isArray(raw) ? (raw as string[]) : [] });
  }
  // AI only *presents* (narrative, concept name, talking points) — it never changes the
  // deterministic facts. This toggle lets the reader collapse to the raw engine plan and
  // see that for themselves; every `enhancement?.x` below already falls back to the engine.
  const [showAi, setShowAi] = useState(true);
  const hasAi = Boolean(result.enhancement);
  const enhancement = showAi ? result.enhancement : null;

  const heroDescription =
    enhancement?.homeownerExplanation ?? `${plan.narrative} ${plan.insight}`;
  const accuracyControls = plan.accuracyUpgrades.filter(
    (u): u is typeof u & { field: SiteField } =>
      u.field === "sun" || u.field === "soil" || u.field === "drainage",
  );
  const navItems = [
    { id: "summary", label: t("navSummary") },
    { id: "buy", label: t("navBuy") },
    { id: "install", label: t("navInstall") },
    { id: "plants", label: t("navPlants") },
    ...(plan.risks.length > 0 ? [{ id: "risks", label: t("navRisks") }] : []),
    { id: "store", label: t("navStore") },
    { id: "evidence", label: t("navEvidence") },
    ...(view === "staff" ? [{ id: "staff", label: t("navStaff") }] : []),
  ];
  const activeSection = useActiveSection(navItems.map((n) => n.id));
  const rootRef = useRef<HTMLDivElement>(null);
  const progress = useReadingProgress(rootRef);

  // Live enrichment is lazy + best-effort: the deterministic plan renders immediately
  // and stands on its own if this is slow, disabled, or fails (docs/DECISIONS.md D1).
  const [live, setLive] = useState<LivePlanEnrichment | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/live/enrich-plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            region: plan.intake.locationQuery ?? plan.intake.regionId,
            items: plan.shoppingList.map((it) => ({
              id: it.name,
              name: it.name,
              category: it.category,
              price: it.price,
            })),
            plants: plan.plants.map((p) => ({ plantId: p.plantId, commonName: p.commonName })),
          }),
        });
        if (!res.ok) return;
        const parsed = LivePlanEnrichment.safeParse(await res.json());
        if (parsed.success) setLive(parsed.data);
      } catch {
        /* deterministic plan stands on its own */
      }
    })();
    return () => controller.abort();
  }, [plan]);

  // Only flagged species raise a caution; non-flagged plants stay quiet (no false alarms).
  const invasiveByName = new Map(
    (live?.invasive ?? [])
      .filter((x) => x.flagged)
      .map((x) => [(x.commonName ?? x.scientificName).toLowerCase(), x]),
  );
  const weather = live?.weather ?? null;
  const hardiness = live?.hardiness ?? null;
  const careFact = live?.plantFacts[0] ?? null;
  // Map live care facts to plants by name so per-plant bloom can show inline — only when a
  // real provider supplied a flowering season (the mock never sets one, so this stays quiet
  // offline / mock-only).
  const factsByName = new Map(
    (live?.plantFacts ?? []).map((f) => [(f.commonName ?? f.scientificName).toLowerCase(), f]),
  );

  return (
    // The parent (PlanExperience) widens to ~1200px for the result step, so here we
    // just lay out a sticky section-nav rail beside the main content on large screens.
    <div>
     <div ref={rootRef} className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Sticky orientation: a slim reading-progress bar over the jump nav tells
          the reader how far through a long plan they are (reduces length anxiety).
          Mobile: a horizontal pill bar. Desktop: a vertical rail beside the plan. */}
      <div className="sticky top-2 z-20 space-y-1.5 sm:top-4 lg:top-6 lg:self-start">
        <div
          className="h-1 w-full overflow-hidden rounded-full bg-border/60"
          role="progressbar"
          aria-label={t("readingProgress")}
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-150 ease-out"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <nav className="glass-chip -mx-1 overflow-x-auto rounded-full p-1 shadow-sm lg:mx-0 lg:overflow-visible lg:rounded-2xl lg:p-1.5">
          <div className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
            {navItems.map((item) => {
              const active = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={active ? "true" : undefined}
                  className={`relative flex min-h-11 items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition lg:min-h-11 lg:rounded-xl lg:px-4 ${
                    active
                      ? "text-on-strong"
                      : "text-muted-foreground hover:bg-brand-soft hover:text-brand-strong"
                  }`}
                >
                  {active ? (
                    <motion.span
                      layoutId="planNavActive"
                      className="absolute inset-0 rounded-full bg-brand lg:rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="relative z-10">{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="min-w-0 space-y-6">

      {/* Hero moment — confidence sentence + visual summary, before any logistics */}
      <section id="summary" className="scroll-mt-24">
       <MagicCard className="rounded-[var(--radius)] border border-border shadow-sm" gradientColor="var(--brand-soft)" gradientOpacity={0.5}>
        <BorderBeam size={120} duration={9} colorFrom="var(--brand)" colorTo="var(--accent)" className="motion-reduce:hidden" />
        <div className="bg-brand-soft p-6">
          {/* Honesty control: AI only writes the wording. Collapse it to see the raw engine plan. */}
          {hasAi ? (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-surface/70 px-2 py-0.5 text-[11px] font-medium text-muted">
                <Sparkles className="size-3" aria-hidden />
                {showAi ? t("aiPresentation") : t("aiHidden")}
              </span>
              <button
                type="button"
                onClick={() => setShowAi((v) => !v)}
                aria-pressed={showAi}
                className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-semibold text-foreground transition hover:border-brand"
              >
                {showAi ? t("aiHide") : t("aiShow")}
              </button>
              <span className="basis-full text-[11px] text-muted">{t("aiNote")}</span>
            </div>
          ) : null}
          {enhancement?.conceptName ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">
              {enhancement.conceptName}
            </p>
          ) : null}
          <h2 className="mt-1 flex items-start gap-1.5 text-2xl font-semibold text-foreground">
            <span>{plan.confidenceSentence}</span>
            <span className="mt-1.5">
              <InfoTip label={t("metricConfidence")}>{t("tipConfidence")}</InfoTip>
            </span>
          </h2>
          <p className="mt-3 max-w-prose text-base leading-relaxed text-foreground/80">{heroDescription}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ConfidenceBadge level={plan.confidence} />
            {plan.visualSummary.moodChips.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>

          {/* Transformation preview — help users FEEL the before → after */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t("now")}</p>
              <p className="mt-1 text-base leading-relaxed text-foreground">{plan.visualSummary.transformation.current}</p>
            </div>
            <div className="rounded-lg border border-brand bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">{t("planned")}</p>
              <p className="mt-1 text-base leading-relaxed text-foreground">{plan.visualSummary.transformation.planned}</p>
            </div>
          </div>
          <p className="mt-3 text-base font-medium text-brand-strong">
            {plan.visualSummary.transformation.feeling}
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {plan.visualSummary.styleLabel} · {plan.visualSummary.expectedEffort}
            </p>
            <ul className="mt-2 space-y-1.5 text-base leading-relaxed text-foreground">
              {plan.visualSummary.whatChangesVisually.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-brand">›</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-accent/10 p-4 text-base leading-relaxed text-foreground">
            <p className="font-semibold text-accent">{t("whySmart")}</p>
            <p className="mt-1">{plan.insight}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-3 text-sm">
          {plan.confidenceReasons.map((r, i) => (
            <span key={i} className="text-muted">
              {r.kind === "good" ? "✓" : "⚠"} {r.text}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 rounded bg-border px-2 py-0.5 text-xs font-medium text-foreground">
            {PLAN_LABEL_KEY[plan.planLabel] ? t(PLAN_LABEL_KEY[plan.planLabel]) : plan.planLabel}
            <InfoTip label={t("tipPlanLabelLabel")}>{t("tipPlanLabel")}</InfoTip>
          </span>
        </div>
       </MagicCard>
      </section>

      <BlurFade inView delay={0.05}>
        <ReadinessMeter readiness={plan.readiness} />
      </BlurFade>

      <BlurFade inView delay={0.08}>
       <section className="grid grid-cols-2 gap-2 rounded-xl border border-brand/20 bg-surface p-3 shadow-sm sm:grid-cols-4">
        <MetricStat label={t("metricDiyRange")} tip={t("tipBudget")} tone="brand">
          <MoneyTicker value={plan.budget.diyTotal} />
        </MetricStat>
        <MetricStat label={t("metricInstall")} tip={t("tipLabor")}>
          {t("metricInstallValue", { hours: plan.labor.totalHours, weekends: plan.labor.weekends })}
        </MetricStat>
        <MetricStat
          label={t("metricConfidence")}
          tip={t("tipConfidence")}
          tone={plan.confidence === "low" ? "warn" : "brand"}
        >
          {plan.confidence}
        </MetricStat>
        <MetricStat
          label={t("metricStore")}
          tip={t("tipStore")}
          tone={plan.storeSearches.some((s) => s.deliveryRecommended) ? "warn" : "neutral"}
        >
          {plan.storeSearches.some((s) => s.deliveryRecommended) ? t("metricStoreDelivery") : t("metricStoreReady")}
        </MetricStat>
       </section>
      </BlurFade>

      {/* See your yard — deterministic concept board with a Now / Planned toggle */}
      <BlurFade inView className="block"><section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">{t("seeYard")}</h3>
          <Link
            href={`/plan/map?goal=${encodeURIComponent(plan.intake.goal)}`}
            onClick={() => stashYardPhoto(photoUrl)}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition hover:border-brand"
          >
            {t("openYardMap")}
          </Link>
          <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs">
            {(["now", "planned", ...(photoUrl ? (["overlay"] as const) : [])] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setBoardView(v);
                  if (v === "planned") trackEvent("plan_visualized", { goal: plan.intake.goal });
                }}
                aria-pressed={boardView === v}
                className={`rounded-full px-3 py-1 capitalize transition ${
                  boardView === v ? "bg-brand text-on-strong" : "text-muted hover:text-foreground"
                }`}
              >
                {v === "now" ? t("viewNow") : v === "planned" ? t("viewPlanned") : t("viewOverlay")}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          {boardView === "planned" ? (
            <ConceptBoard plants={plan.plants} />
          ) : boardView === "overlay" && photoUrl ? (
            <YardPreviewOverlay photoUrl={photoUrl} plants={plan.plants} />
          ) : photoUrl ? (
            <div className="overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "5 / 3" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={t("yourYardNow")} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div
              className="flex w-full items-center justify-center rounded-xl border border-dashed border-border p-6 text-center"
              style={{ aspectRatio: "5 / 3" }}
            >
              <p className="max-w-sm text-sm text-muted">{plan.visualSummary.transformation.current}</p>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm font-medium text-brand-strong">
          {plan.visualSummary.transformation.feeling}
        </p>
        <ImaginedView prompt={enhancement?.imagePrompt} photoUrl={photoUrl} />

        <div className="mt-4 border-t border-border pt-4">
          {!arOpen ? (
            <button
              onClick={() => {
                setArOpen(true);
                trackEvent("ar_opened");
              }}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand"
            >
              {t("viewInSpace")}
            </button>
          ) : (
            <ArView />
          )}
        </div>
      </section></BlurFade>

      {/* Natural-language command bar — maps plain language onto the refinements below */}
      <CommandBar adjustments={adjustments} busy={busy} onRefine={onRefine} />

      <PlanCopilotDrawer
        section={copilot}
        open={copilot !== null}
        onOpenChange={(o) => !o && setCopilot(null)}
        onRefine={onRefine}
        region={copilotRegion}
      />

      {/* Refinement chips — first plan is Draft 1 */}
      <section className="card p-5">
        <p className="text-sm font-semibold text-foreground">{t("firstDraft")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {REFINEMENTS.map((r) => {
            const active = adjustments.includes(r.value);
            return (
              <button
                key={r.value}
                disabled={busy}
                onClick={() => onRefine(r.value)}
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-sm transition disabled:opacity-50 ${
                  active ? "bg-brand text-on-strong" : "border border-border text-foreground hover:border-brand"
                }`}
              >
                {tr(r.value)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Accuracy Upgrade Card — unknown reduces confidence, never blocks */}
      {accuracyControls.length > 0 ? (
        <Section
          title={t("moreAccurateTitle")}
          subtitle={t("moreAccurateSubtitle")}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {accuracyControls.map((u) => (
              <label key={u.field} className="block">
                <span className="mb-1 block text-sm text-foreground">{u.question}</span>
                <select
                  disabled={busy}
                  defaultValue=""
                  onChange={(e) => e.target.value && onAccuracy(u.field, e.target.value)}
                  className="card w-full p-2 text-sm"
                >
                  <option value="" disabled>
                    {t("choose")}
                  </option>
                  {ACCURACY_CONTROLS[u.field].map((o) => (
                    <option key={o.value} value={o.value}>
                      {to(`${u.field}.${o.value}`)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Top actions */}
      <Section title={t("topActions")} variant="decision">
        <ol className="space-y-2">
          {plan.topActions.map((a, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-strong">
                {i + 1}
              </span>
              {a}
            </li>
          ))}
        </ol>
      </Section>

      {/* Budget */}
      <Section
        id="buy"
        title={t("budget")}
        subtitle={t("budgetSubtitle")}
        variant="action"
        action={<PlanSectionActions onAsk={() => openCopilot("budget", t("budget"), "promptsBudget")} />}
      >
        <p className="flex flex-wrap items-center gap-1.5 text-2xl font-semibold text-foreground">
          {t("expectedDiyTotal")} <MoneyTicker value={plan.budget.diyTotal} />
          <span className="self-start">
            <InfoTip label={t("budget")}>{t("tipBudget")}</InfoTip>
          </span>
          <span className="self-center">
            <VerificationBadge status="estimate" />
          </span>
        </p>
        {view !== "simple" ? (
          <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
            <ul className="divide-y divide-border text-base">
              {plan.budget.byCategory.map((c) => (
                <li key={c.category} className="flex justify-between py-2">
                  <span className="text-muted-foreground">{c.category}</span>
                  <Money value={c.price} />
                </li>
              ))}
            </ul>
            <PlanCharts budget={plan.budget} installPhases={plan.installPhases} />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border text-base">
            {plan.budget.byCategory.map((c) => (
              <li key={c.category} className="flex justify-between py-2">
                <span className="text-muted-foreground">{c.category}</span>
                <Money value={c.price} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Quick / Better / Best — estimate framings of the same plan (free-data grounded) */}
      {plan.tiers && plan.tiers.length > 0 ? (
        <Section title={t("tiersTitle")} subtitle={t("tiersSubtitle")} variant="quiet">
          <div className="grid gap-3 sm:grid-cols-3">
            {plan.tiers.map((tier) => (
              <div
                key={tier.tier}
                className={`rounded-lg border p-3 ${
                  tier.tier === "better_fix" ? "border-brand bg-brand-soft" : "border-border"
                }`}
              >
                <p className="flex items-center gap-1 text-sm font-semibold text-foreground">
                  {t(`tier_${tier.tier}`)}
                  <InfoTip label={t("tiersTitle")}>{t("tipTier")}</InfoTip>
                </p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  <MoneyTicker value={tier.estTotal} />
                </p>
                <p className="mt-1 text-xs text-muted">{tier.summary}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{t("tiersDisclaimer")}</p>
        </Section>
      ) : null}

      {/* Shopping list — sortable table in Details, grouped by priority in Simple */}
      <Section
        title={t("shoppingList")}
        variant="action"
        action={<PlanSectionActions onAsk={() => openCopilot("shopping", t("shoppingList"), "promptsShopping")} />}
      >
        {view !== "simple" ? (
          <ShoppingTable items={plan.shoppingList} />
        ) : (
        <div className="space-y-4">
          {PRIORITY_GROUPS.map((group) => {
            const items = plan.shoppingList.filter((i) => i.priority === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{t(group.labelKey)}</h4>
                  <span className="text-xs text-muted">{t(group.noteKey)}</span>
                </div>
                <ul className="mt-1 divide-y divide-border text-sm">
                  {items.map((item, i) => (
                    <li key={`${item.name}-${i}`} className="flex justify-between py-1.5">
                      <span className="text-foreground">
                        {item.quantity} {item.unit}
                        {item.quantity > 1 ? "s" : ""} · {item.name}
                      </span>
                      <Money value={item.price} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        )}
      </Section>

      {/* Install timeline — framed as achievable weekends with a planting window */}
      <Section
        id="install"
        title={t("installPlan")}
        variant="action"
        subtitle={t("installSubtitle", {
          hours: plan.labor.totalHours,
          people: plan.labor.people,
          effort: plan.visualSummary.expectedEffort.split(" · ")[0],
        })}
        action={<PlanSectionActions onAsk={() => openCopilot("timeline", t("installPlan"), "promptsTimeline")} />}
      >
        <p className="mb-3 inline-block rounded bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
          {t("bestPlantingWindow", { window: plan.bestWeatherWindow })}
        </p>
        <ol className="space-y-3">
          {plan.installPhases.map((p) => (
            <li key={p.order} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-strong">
                {p.order}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {p.title} <span className="font-normal text-muted">· ~{p.estHours}h</span>
                </p>
                <p className="text-sm text-muted">{p.description}</p>
                {p.guides && p.guides.length > 0 ? (
                  <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                    <span className="text-muted">{t("howToLabel")}:</span>
                    {p.guides.map((g) => (
                      <a
                        key={g.topic}
                        href={g.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        {g.title}
                      </a>
                    ))}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
        {weather ? (
          <p className="mt-3 rounded-lg border border-blueprint/30 bg-blueprint-soft px-3 py-2 text-xs text-foreground">
            <span className="font-semibold">{tLive("timingTitle")}:</span> {weather.plantingNote}
          </p>
        ) : null}
        {hardiness ? (
          <p
            className={`mt-2 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              hardiness.outOfRange.length > 0
                ? "border-warn/30 bg-warn/10 text-foreground"
                : "border-blueprint/30 bg-blueprint-soft text-foreground"
            }`}
          >
            <span>
              <span className="font-semibold">{tLive("hardinessTitle")}:</span>{" "}
              {tLive("hardinessZone", { zip: hardiness.query, zone: hardiness.zone })}{" "}
              {hardiness.outOfRange.length > 0
                ? tLive("hardinessOutOfRange", { plants: hardiness.outOfRange.join(", ") })
                : tLive("hardinessAllHardy")}
            </span>
            <InfoTip label={tLive("hardinessTitle")}>
              {hardiness.outOfRange.length > 0 ? t("tipOutOfZone") : t("tipHardiness")}
            </InfoTip>
            <LiveBadge source={hardiness.source} />
          </p>
        ) : null}
      </Section>

      {/* Plants */}
      <Section
        id="plants"
        title={t("plants")}
        subtitle={t("plantsSubtitle", { count: plan.plants.length })}
        variant="quiet"
        action={<PlanSectionActions onAsk={() => openCopilot("plants", t("plants"), "promptsPlants")} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plan.plants.map((p) => (
            <div key={p.plantId} className="rounded-lg border border-border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold text-foreground">
                  {p.quantity}× {localizePlantName(p.plantId, p.commonName, locale)}
                </span>
                {showNumbers ? (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    {t("fitScore", { score: Math.round(p.fit.score * 100) })}
                    <InfoTip label={t("tipFitScoreLabel")}>{t("tipFitScore")}</InfoTip>
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{p.spacingNote}</p>
              {p.safety.toxic || p.safety.invasive ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.safety.toxic ? (
                    <span className="rounded-full bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warn">
                      {t("badgeToxic")}
                    </span>
                  ) : null}
                  {p.safety.invasive ? (
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger">
                      {t("badgeInvasive")}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {showNumbers ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.matureSize} · {p.sunLabel} · {t("maintenanceSuffix", { level: p.maintenance })}
                </p>
              ) : null}
              {p.fit.reasons[0] ? <p className="mt-1 text-sm text-brand-strong">✓ {p.fit.reasons[0]}</p> : null}
              {p.fit.warnings[0] ? <p className="mt-0.5 text-sm text-warn">⚠ {p.fit.warnings[0]}</p> : null}
              {(() => {
                const inv = invasiveByName.get(p.commonName.toLowerCase());
                return inv ? <p className="mt-0.5 text-sm text-warn">⚠ {inv.note}</p> : null;
              })()}
              {(() => {
                const facts = factsByName.get(p.commonName.toLowerCase());
                return facts?.bloom ? (
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span>
                      <span className="font-medium text-foreground">{t("bloomsLabel")}:</span>{" "}
                      {facts.bloom}
                    </span>
                    <LiveBadge source={facts.source} />
                  </p>
                ) : null;
              })()}
              {(() => {
                const alt = plan.alternatives.find((a) => a.plantId === p.plantId);
                return alt ? <AlternativeOptions alt={alt} /> : null;
              })()}
            </div>
          ))}
        </div>
        {careFact?.careSummary ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>
              <span className="font-medium text-foreground">{tLive("careTitle")}:</span>{" "}
              {careFact.careSummary}
            </span>
            <LiveBadge source={careFact.source} />
          </p>
        ) : null}
      </Section>

      {/* Across the seasons — season-of-interest from the Core Library notes (not exact months) */}
      <Section title={t("seasonsTitle")} subtitle={t("seasonsSubtitle")} variant="quiet">
        <div className="grid gap-3 sm:grid-cols-4">
          {(
            [
              ["spring", "seasonSpring"],
              ["summer", "seasonSummer"],
              ["fall", "seasonFall"],
              ["winter", "seasonWinter"],
            ] as const
          ).map(([key, label]) => {
            const names = plan.seasonalInterest[key];
            const hasEvergreen = plan.seasonalInterest.evergreenStructure.length > 0;
            return (
              <div key={key} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">{t(label)}</p>
                {names.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-sm text-foreground">
                    {names.map((n) => (
                      <li key={n}>• {n}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasEvergreen ? t("seasonsEvergreen") : t("seasonsQuiet")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {plan.seasonalInterest.evergreenStructure.length > 0 ? (
          <p className="mt-2 text-xs text-muted">
            {t("seasonsStructure", { plants: plan.seasonalInterest.evergreenStructure.join(", ") })}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">{t("seasonsNote")}</p>
      </Section>

      {/* Risks */}
      {plan.risks.length > 0 ? (
        <Section
          id="risks"
          title={t("whatToWatch")}
          variant="trust"
          action={<PlanSectionActions onAsk={() => openCopilot("risks", t("whatToWatch"), "promptsRisks")} />}
        >
          <ul className="space-y-2">
            {plan.risks.map((r) => (
              <li key={r.id} className="text-sm">
                <span className="flex items-center gap-2">
                  <SeverityTag severity={r.severity} />
                  <span className="font-medium text-foreground">{r.message}</span>
                </span>
                <p className="mt-0.5 pl-1 text-muted">→ {r.mitigation}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Trust moat: what-if failures + honest store reality */}
      <FailurePointsCard points={plan.failurePoints} />
      <div id="store" className="scroll-mt-24">
        <StoreRealityCheck searches={plan.storeSearches} live={live?.storeReality} regionId={plan.site.regionId} />
      </div>

      <div id="evidence" className="scroll-mt-24">
        <EvidenceDrawer evidence={plan.evidence} view={view} />
      </div>

      {/* Tools & equipment (details) */}
      {view !== "simple" ? (
        <Section title={t("toolsTitle")}>
          <p className="text-sm text-foreground">
            <span className="font-medium">{t("toolsLabel")}</span> {plan.tools.map((tool) => tool.name).join(", ")}
          </p>
          {plan.equipment.length > 0 ? (
            <p className="mt-1 text-sm text-foreground">
              <span className="font-medium">{t("rentalsLabel")}</span>{" "}
              {plan.equipment.map((e) => e.name).join(", ")}
            </p>
          ) : null}
        </Section>
      ) : null}

      {/* Staff helper — deterministic, practical content (works without AI) */}
      {view === "staff" ? (
        <Section id="staff" title={t("staffTitle")} subtitle={t("staffSubtitle")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <StaffList title={t("staffQuestionsFirst")} items={plan.staff.questionsFirst} />
            <StaffList title={t("staffUnderestimates")} items={plan.staff.customerUnderestimates} />
            <StaffList title={t("staffGoodBetterBest")} items={plan.staff.goodBetterBest} />
            <StaffList title={t("staffIfTooExpensive")} items={plan.staff.ifTooExpensive} />
            <StaffList title={t("staffIfNoTruck")} items={plan.staff.ifNoTruckOrDelivery} />
            <StaffList title={t("staffIfSafety")} items={plan.staff.ifDogKidSafetyMatters} />
            <StaffList title={t("staffIfOutOfStock")} items={plan.staff.ifOutOfStock} />
            <StaffList title={t("staffSubstitutions")} items={plan.staff.substitutions} />
            <StaffList title={t("staffUpsells")} items={plan.staff.upsells} />
            <StaffList title={t("staffWhatNotToSell")} items={plan.staff.whatNotToSell} />
            {enhancement?.staffTalkingPoints ? (
              <StaffList title={t("staffTalkingPoints")} items={enhancement.staffTalkingPoints} />
            ) : null}
          </div>
          <p className="mt-3 rounded bg-border/50 p-2 text-xs text-muted">
            {plan.staff.disclaimer}
          </p>
        </Section>
      ) : null}

      {/* Honesty footer */}
      {plan.site.assumptions.length > 0 ? (
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1 text-xs text-muted">
          <span className="self-center">
            <AssumptionBadge />
          </span>
          <span>{plan.site.assumptions.join(" ")}</span>
        </div>
      ) : null}

      <BackToTop label={t("backToTop")} />
      </div>
     </div>
    </div>
  );
}

/**
 * Floating escape hatch for the long plan. Appears once the reader has scrolled
 * past the hero; sits above the mobile bottom nav so it never overlaps it.
 */
function BackToTop({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={label}
      title={label}
      className={`no-print fixed bottom-20 right-4 z-30 flex size-11 items-center justify-center rounded-full border border-border bg-surface/95 text-foreground shadow-lg backdrop-blur transition sm:bottom-6 ${
        show ? "opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}

/**
 * Fraction (0–1) the reader has scrolled through the report element, used to
 * drive the slim progress bar in the sticky header.
 */
function useReadingProgress(ref: React.RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -el.getBoundingClientRect().top;
      setProgress(total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [ref]);
  return progress;
}

/**
 * Scroll-spy: returns the id of the section currently nearest the top of the
 * viewport so the sticky jump-nav can highlight where the reader is.
 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  // Stable key so the effect re-subscribes only when the section set changes.
  const key = ids.join("|");

  useEffect(() => {
    const sectionIds = key.split("|").filter(Boolean);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      // Trigger when a section sits in the upper band, below the sticky nav.
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

function StaffList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
