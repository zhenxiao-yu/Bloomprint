"use client";

import { useTranslations } from "next-intl";
import type { BloomprintPlan } from "@/domain/models";
import { diffPlans } from "@/lib/planDiff";
import { MetricPill, Money, Section } from "@/components/ui";

export function CompareView({
  a,
  b,
}: {
  a: { label: string; plan: BloomprintPlan };
  b: { label: string; plan: BloomprintPlan };
}) {
  const t = useTranslations("Compare");
  const diff = diffPlans(a.plan, b.plan);

  const deltaLabel = (min: number, max: number): string => {
    const fmt = (n: number) => (n > 0 ? `+$${n}` : n < 0 ? `-$${Math.abs(n)}` : "$0");
    return `${fmt(min)} ${t("to")} ${fmt(max)}`;
  };

  const column = (entry: { label: string; plan: BloomprintPlan }) => {
    const p = entry.plan.plan;
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">{entry.label}</p>
        <p className="mt-1 text-xs text-muted">{p.styleLabel}</p>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{t("diyTotal")}</dt>
            <dd>
              <Money value={p.budget.diyTotal} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("plants")}</dt>
            <dd>{t("typesCount", { count: p.plants.length })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("confidence")}</dt>
            <dd className="capitalize">{p.confidence}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("effort")}</dt>
            <dd className="text-right text-xs">{p.visualSummary.expectedEffort}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("labor")}</dt>
            <dd>{p.labor.totalHours}h</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">{t("privacy")}</dt>
            <dd>{p.plants.filter((plant) => plant.role === "screen").length > 0 ? t("screening") : t("light")}</dd>
          </div>
        </dl>
      </div>
    );
  };

  return (
    <Section title={t("title")} subtitle={t("subtitle")}>
      <div className="grid gap-3 sm:grid-cols-2">
        {column(a)}
        {column(b)}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <MetricPill label={t("budget")} value={deltaLabel(diff.budgetDelta.min, diff.budgetDelta.max)} tone={diff.budgetDelta.max > 0 ? "warn" : "brand"} />
        <MetricPill label={t("labor")} value={diff.laborDelta > 0 ? `+${diff.laborDelta}h` : `${diff.laborDelta}h`} />
        <MetricPill label={t("privacy")} value={`${diff.privacyA} → ${diff.privacyB}`} />
        <MetricPill label={t("heavyWork")} value={`${diff.heavyWorkA ? t("yes") : t("no")} → ${diff.heavyWorkB ? t("yes") : t("no")}`} tone={diff.heavyWorkB ? "warn" : "neutral"} />
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p>
          <span className="font-medium text-foreground">{t("style")}</span>{" "}
          {diff.styleChanged ? `${diff.styleA} → ${diff.styleB}` : t("styleSame", { style: diff.styleA })}
        </p>
        <p>
          <span className="font-medium text-foreground">{t("maintenance")}</span> {diff.maintenanceA} → {diff.maintenanceB}
        </p>
        {diff.addedPlants.length > 0 ? (
          <p>
            <span className="font-medium text-brand-strong">{t("added")}</span> {diff.addedPlants.join(", ")}
          </p>
        ) : null}
        {diff.removedPlants.length > 0 ? (
          <p>
            <span className="font-medium text-[var(--warn)]">{t("removed")}</span>{" "}
            {diff.removedPlants.join(", ")}
          </p>
        ) : null}
        {diff.addedPlants.length === 0 && diff.removedPlants.length === 0 ? (
          <p className="text-muted">{t("samePalette")}</p>
        ) : null}
      </div>
    </Section>
  );
}
