"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("SavedPlans");
  const tc = useTranslations("Common");
  if (plans.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-medium text-foreground">{t("emptyTitle")}</p>
        <p className="mt-1 text-sm text-muted">
          {t("emptyBodyBefore")} <span className="font-medium">{t("emptySaveLabel")}</span>{" "}
          {t("emptyBodyAfter")}
        </p>
        <Link
          href="/plan"
          className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong"
        >
          {tc("startPlan")}
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
              <button
                type="button"
                onClick={() => onToggle(plan.id)}
                aria-pressed={isSelected}
                aria-label={t("selectAria", { label: plan.label })}
                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition ${
                  isSelected ? "border-brand bg-brand text-on-strong" : "border-border text-muted hover:border-brand"
                }`}
              >
                {isSelected ? "✓" : "+"}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold capitalize text-foreground">{plan.label}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {plan.summary.versionLabel ?? t("draftDefault")} ·{" "}
                  {plan.summary.styleLabel} · ${plan.summary.diyMin.toLocaleString()}–$
                  {plan.summary.diyMax.toLocaleString()} ·{" "}
                  {t("confidenceSuffix", { confidence: plan.summary.confidence })} ·{" "}
                  {t("plantTypes", { count: plan.summary.plantCount })}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t("laborHours", { hours: plan.summary.laborHours ?? "?" })} ·{" "}
                  {plan.summary.privacy ?? t("privacyUnknown")} ·{" "}
                  {plan.summary.maintenance
                    ? t("maintenanceSuffix", { level: plan.summary.maintenance })
                    : t("maintenanceUnknown")}
                  {plan.summary.heavyWorkWarning ? ` · ${t("heavyMaterials")}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {t("savedOn", { date: new Date(plan.createdAt).toLocaleDateString() })}
                  {plan.adjustments.length > 0
                    ? ` · ${t("refinements", { count: plan.adjustments.length })}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link
                href={openHref(plan)}
                className="rounded-full bg-brand px-4 py-1 font-medium text-on-strong"
              >
                {t("open")}
              </Link>
              <button
                onClick={() => onRename(plan.id)}
                className="rounded-full border border-border px-4 py-1 text-foreground hover:border-brand"
              >
                {t("rename")}
              </button>
              <button
                onClick={() => onDelete(plan.id)}
                className="rounded-full border border-border px-4 py-1 text-[var(--danger)] hover:border-[var(--danger)]"
              >
                {t("delete")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
