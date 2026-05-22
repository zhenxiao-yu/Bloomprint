"use client";

import type { BloomprintPlan } from "@/domain/models";
import { diffPlans } from "@/lib/planDiff";
import { Money, Section } from "@/components/ui";

function deltaLabel(min: number, max: number): string {
  const fmt = (n: number) => (n > 0 ? `+$${n}` : n < 0 ? `-$${Math.abs(n)}` : "$0");
  return `${fmt(min)} to ${fmt(max)}`;
}

export function CompareView({
  a,
  b,
}: {
  a: { label: string; plan: BloomprintPlan };
  b: { label: string; plan: BloomprintPlan };
}) {
  const diff = diffPlans(a.plan, b.plan);

  const column = (entry: { label: string; plan: BloomprintPlan }) => {
    const p = entry.plan.plan;
    return (
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-semibold text-foreground">{entry.label}</p>
        <p className="mt-1 text-xs text-muted">{p.styleLabel}</p>
        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">DIY total</dt>
            <dd>
              <Money value={p.budget.diyTotal} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Plants</dt>
            <dd>{p.plants.length} types</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Confidence</dt>
            <dd className="capitalize">{p.confidence}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Effort</dt>
            <dd className="text-right text-xs">{p.visualSummary.expectedEffort}</dd>
          </div>
        </dl>
      </div>
    );
  };

  return (
    <Section title="Comparison" subtitle="Side-by-side, with what changed between the two.">
      <div className="grid gap-3 sm:grid-cols-2">
        {column(a)}
        {column(b)}
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p>
          <span className="font-medium text-foreground">Style:</span>{" "}
          {diff.styleChanged ? `${diff.styleA} → ${diff.styleB}` : `Same (${diff.styleA})`}
        </p>
        <p>
          <span className="font-medium text-foreground">Budget change:</span>{" "}
          {deltaLabel(diff.budgetDelta.min, diff.budgetDelta.max)}
        </p>
        {diff.addedPlants.length > 0 ? (
          <p>
            <span className="font-medium text-brand-strong">Added:</span> {diff.addedPlants.join(", ")}
          </p>
        ) : null}
        {diff.removedPlants.length > 0 ? (
          <p>
            <span className="font-medium text-[var(--warn)]">Removed:</span>{" "}
            {diff.removedPlants.join(", ")}
          </p>
        ) : null}
        {diff.addedPlants.length === 0 && diff.removedPlants.length === 0 ? (
          <p className="text-muted">Same plant palette.</p>
        ) : null}
      </div>
    </Section>
  );
}
