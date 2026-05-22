"use client";

import { useState } from "react";
import type { BloomprintPlan, ShoppingPriority } from "@/domain/models";
import { DRAINAGE_OPTIONS, REFINEMENTS, SOIL_OPTIONS, SUN_OPTIONS } from "@/lib/uiOptions";
import { Chip, Money, Section, SeverityTag } from "@/components/ui";
import { ConceptBoard } from "@/components/ConceptBoard";
import { ImaginedView } from "@/components/ImaginedView";
import { trackEvent } from "@/lib/analytics";

export type ViewMode = "simple" | "details" | "staff";

const PLAN_LABEL_TEXT: Record<string, string> = {
  "buildable-estimate": "Buildable estimate",
  "concept-placement": "Concept placement",
  "needs-local-verification": "Needs local verification",
};

const PRIORITY_GROUPS: { key: ShoppingPriority; label: string; note: string }[] = [
  { key: "buy-first", label: "Buy First", note: "Everything you need for planting day." },
  { key: "can-wait", label: "Can Wait", note: "Improves the finished look later." },
  { key: "optional", label: "Optional Upgrades", note: "Only if the budget allows." },
];

type SiteField = "sun" | "soil" | "drainage";
const ACCURACY_CONTROLS: Record<SiteField, { value: string; label: string }[]> = {
  sun: SUN_OPTIONS,
  soil: SOIL_OPTIONS,
  drainage: DRAINAGE_OPTIONS,
};

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
  adjustments: string[];
  busy: boolean;
  onRefine: (adjustment: (typeof REFINEMENTS)[number]["value"]) => void;
  onAccuracy: (field: "sun" | "soil" | "drainage", value: string) => void;
  photoUrl?: string | null;
}) {
  const { plan, enhancement } = result;
  const showNumbers = view !== "simple";
  const [boardView, setBoardView] = useState<"now" | "planned">("planned");

  const heroDescription =
    enhancement?.homeownerExplanation ?? `${plan.narrative} ${plan.insight}`;
  const accuracyControls = plan.accuracyUpgrades.filter(
    (u): u is typeof u & { field: SiteField } =>
      u.field === "sun" || u.field === "soil" || u.field === "drainage",
  );

  return (
    <div className="space-y-5">
      {/* Hero moment — confidence sentence + visual summary, before any logistics */}
      <section className="card overflow-hidden">
        <div className="bg-brand-soft p-6">
          {enhancement?.conceptName ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">
              {enhancement.conceptName}
            </p>
          ) : null}
          <h2 className="mt-1 text-2xl font-semibold text-foreground">{plan.confidenceSentence}</h2>
          <p className="mt-2 max-w-2xl text-sm text-foreground/80">{heroDescription}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {plan.visualSummary.moodChips.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </div>

          {/* Transformation preview — help users FEEL the before → after */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Now</p>
              <p className="mt-1 text-sm text-foreground">{plan.visualSummary.transformation.current}</p>
            </div>
            <div className="rounded-lg border border-brand bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-strong">Planned</p>
              <p className="mt-1 text-sm text-foreground">{plan.visualSummary.transformation.planned}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-brand-strong">
            {plan.visualSummary.transformation.feeling}
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {plan.visualSummary.styleLabel} · {plan.visualSummary.expectedEffort}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {plan.visualSummary.whatChangesVisually.map((w) => (
                <li key={w} className="flex gap-2">
                  <span className="text-brand">›</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-[var(--accent)]/10 p-4 text-sm text-foreground">
            <p className="font-semibold text-[var(--accent)]">Why this is smart</p>
            <p className="mt-1">{plan.insight}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-3 text-sm">
          {plan.confidenceReasons.map((r, i) => (
            <span key={i} className="text-muted">
              {r.kind === "good" ? "✓" : "⚠"} {r.text}
            </span>
          ))}
          <span className="ml-auto rounded bg-border px-2 py-0.5 text-xs font-medium text-foreground">
            {PLAN_LABEL_TEXT[plan.planLabel]}
          </span>
        </div>
      </section>

      {/* See your yard — deterministic concept board with a Now / Planned toggle */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">See your yard</h3>
          <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs">
            {(["now", "planned"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setBoardView(v);
                  if (v === "planned") trackEvent("plan_visualized", { goal: plan.intake.goal });
                }}
                aria-pressed={boardView === v}
                className={`rounded-full px-3 py-1 capitalize transition ${
                  boardView === v ? "bg-brand text-white" : "text-muted hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          {boardView === "planned" ? (
            <ConceptBoard plants={plan.plants} />
          ) : photoUrl ? (
            <div className="overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "5 / 3" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Your yard now" className="h-full w-full object-cover" />
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
        <ImaginedView prompt={enhancement?.imagePrompt} />
      </section>

      {/* Refinement chips — first plan is Draft 1 */}
      <section className="card p-5">
        <p className="text-sm font-semibold text-foreground">This is your first draft. Adjust it:</p>
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
                  active ? "bg-brand text-white" : "border border-border text-foreground hover:border-brand"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Accuracy Upgrade Card — unknown reduces confidence, never blocks */}
      {accuracyControls.length > 0 ? (
        <Section
          title="Make this more accurate"
          subtitle="Your plan is usable now. A few details would sharpen it — answer any you know."
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
                    Choose…
                  </option>
                  {ACCURACY_CONTROLS[u.field].map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Top actions */}
      <Section title="Top actions">
        <ol className="space-y-2">
          {plan.topActions.map((a, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {i + 1}
              </span>
              {a}
            </li>
          ))}
        </ol>
      </Section>

      {/* Budget */}
      <Section title="Budget" subtitle="Ranges, not quotes — confirm local prices before buying.">
        <p className="text-2xl font-semibold text-foreground">
          Expected DIY total: <Money value={plan.budget.diyTotal} />
        </p>
        <ul className="mt-3 divide-y divide-border text-sm">
          {plan.budget.byCategory.map((c) => (
            <li key={c.category} className="flex justify-between py-1.5">
              <span className="text-muted">{c.category}</span>
              <Money value={c.price} />
            </li>
          ))}
        </ul>
      </Section>

      {/* Shopping list grouped by priority */}
      <Section title="Shopping list">
        <div className="space-y-4">
          {PRIORITY_GROUPS.map((group) => {
            const items = plan.shoppingList.filter((i) => i.priority === group.key);
            if (items.length === 0) return null;
            return (
              <div key={group.key}>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{group.label}</h4>
                  <span className="text-xs text-muted">{group.note}</span>
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
      </Section>

      {/* Install timeline — framed as achievable weekends with a planting window */}
      <Section
        title="Install plan"
        subtitle={`About ${plan.labor.totalHours} hours · ${plan.labor.people} person(s) · ${plan.visualSummary.expectedEffort.split(" · ")[0]}`}
      >
        <p className="mb-3 inline-block rounded bg-brand-soft px-3 py-1 text-xs font-medium text-brand-strong">
          🌱 Best planting window: {plan.bestWeatherWindow}
        </p>
        <ol className="space-y-3">
          {plan.installPhases.map((p) => (
            <li key={p.order} className="border-l-2 border-brand pl-3">
              <p className="text-sm font-semibold text-foreground">
                {p.order}. {p.title}{" "}
                <span className="font-normal text-muted">· ~{p.estHours}h</span>
              </p>
              <p className="text-sm text-muted">{p.description}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Plants */}
      <Section title="Plants" subtitle={`${plan.plants.length} types from the Bloomprint Core Library`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {plan.plants.map((p) => (
            <div key={p.plantId} className="rounded-lg border border-border p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {p.quantity}× {p.commonName}
                </span>
                {showNumbers ? (
                  <span className="text-xs text-muted">fit {Math.round(p.fit.score * 100)}%</span>
                ) : null}
              </div>
              <p className="text-xs text-muted">{p.spacingNote}</p>
              {showNumbers ? (
                <p className="mt-1 text-xs text-muted">
                  {p.matureSize} · {p.sunLabel} · {p.maintenance} maintenance
                </p>
              ) : null}
              {p.fit.reasons[0] ? <p className="mt-1 text-xs text-brand-strong">✓ {p.fit.reasons[0]}</p> : null}
              {p.fit.warnings[0] ? <p className="mt-0.5 text-xs text-[var(--warn)]">⚠ {p.fit.warnings[0]}</p> : null}
            </div>
          ))}
        </div>
      </Section>

      {/* Risks */}
      {plan.risks.length > 0 ? (
        <Section title="What to watch">
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

      {/* Tools & equipment (details) */}
      {view !== "simple" ? (
        <Section title="Tools & equipment">
          <p className="text-sm text-foreground">
            <span className="font-medium">Tools:</span> {plan.tools.map((t) => t.name).join(", ")}
          </p>
          {plan.equipment.length > 0 ? (
            <p className="mt-1 text-sm text-foreground">
              <span className="font-medium">Possible rentals:</span>{" "}
              {plan.equipment.map((e) => e.name).join(", ")}
            </p>
          ) : null}
        </Section>
      ) : null}

      {/* Staff helper — deterministic, practical content (works without AI) */}
      {view === "staff" ? (
        <Section title="Staff helper" subtitle="Guidance for helping a customer — not a guarantee.">
          <div className="grid gap-4 sm:grid-cols-2">
            <StaffList title="Customer probably underestimates" items={plan.staff.customerUnderestimates} />
            <StaffList title="If out of stock, try" items={plan.staff.substitutions} />
            <StaffList title="Genuine add-ons to mention" items={plan.staff.upsells} />
            {enhancement?.staffTalkingPoints ? (
              <StaffList title="Talking points" items={enhancement.staffTalkingPoints} />
            ) : null}
          </div>
          {enhancement?.alternatives ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-foreground">Good / Better / Best</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground">
                {enhancement.alternatives.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-3 rounded bg-border/50 p-2 text-xs text-muted">
            Use this as guidance, not a guarantee. Confirm local availability, the customer&apos;s
            actual site conditions, and product labels.
          </p>
        </Section>
      ) : null}

      {/* Honesty footer */}
      {plan.site.assumptions.length > 0 ? (
        <p className="px-1 text-xs text-muted">
          <span className="font-medium">Assumptions:</span> {plan.site.assumptions.join(" ")}
        </p>
      ) : null}
    </div>
  );
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
