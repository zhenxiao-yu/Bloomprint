"use client";

import Link from "next/link";
import type { SavedPlan } from "@/lib/plansStore";
import { encodeShare } from "@/lib/shareLink";

function openHref(plan: SavedPlan): string {
  return `/plan?p=${encodeShare({ intake: plan.intake, adjustments: plan.adjustments })}`;
}

export function SavedPlans({
  plans,
  selected,
  onToggle,
  onRename,
  onDelete,
}: {
  plans: SavedPlan[];
  selected: string[];
  onToggle: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (plans.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-foreground">No saved plans yet</p>
        <p className="mt-1 text-sm text-muted">
          Build a plan and tap <span className="font-medium">Save plan</span> — it&apos;ll show up
          here so you can revisit and compare versions.
        </p>
        <Link
          href="/plan"
          className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
        >
          Start a plan
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {plans.map((plan) => {
        const isSelected = selected.includes(plan.id);
        return (
          <li key={plan.id} className={`card p-4 ${isSelected ? "ring-2 ring-brand" : ""}`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(plan.id)}
                className="mt-1"
                aria-label={`Select ${plan.label} to compare`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize text-foreground">{plan.label}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {plan.summary.styleLabel} · ${plan.summary.diyMin.toLocaleString()}–$
                  {plan.summary.diyMax.toLocaleString()} · {plan.summary.confidence} confidence ·{" "}
                  {plan.summary.plantCount} plant types
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Saved {new Date(plan.createdAt).toLocaleDateString()}
                  {plan.adjustments.length > 0 ? ` · ${plan.adjustments.length} refinement(s)` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link
                href={openHref(plan)}
                className="rounded-full bg-brand px-4 py-1 font-medium text-white"
              >
                Open
              </Link>
              <button
                onClick={() => onRename(plan.id)}
                className="rounded-full border border-border px-4 py-1 text-foreground hover:border-brand"
              >
                Rename
              </button>
              <button
                onClick={() => onDelete(plan.id)}
                className="rounded-full border border-border px-4 py-1 text-[var(--danger)] hover:border-[var(--danger)]"
              >
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
