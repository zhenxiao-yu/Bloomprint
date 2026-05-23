"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { BloomprintPlan } from "@/domain/models";
import { deletePlan, renamePlan, useSavedPlans, type SavedPlan } from "@/lib/plansStore";
import { SavedPlans } from "@/components/SavedPlans";
import { CompareView } from "@/components/CompareView";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { trackEvent } from "@/lib/analytics";
import { readApiError } from "@/lib/apiError";

interface Comparison {
  a: { label: string; plan: BloomprintPlan };
  b: { label: string; plan: BloomprintPlan };
}

async function fetchSaved(p: SavedPlan, regenError: string): Promise<BloomprintPlan> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ intake: p.intake, adjustments: p.adjustments }),
  });
  if (!res.ok) throw new Error(await readApiError(res, regenError));
  return res.json();
}

export default function PlansPage() {
  const t = useTranslations("SavedPlans");
  const plans = useSavedPlans();
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setComparison(null);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 2 ? [prev[1], id] : [...prev, id],
    );
  }

  function rename(id: string) {
    const current = plans.find((p) => p.id === id);
    const label = window.prompt(t("renamePrompt"), current?.label ?? "");
    if (label && label.trim()) renamePlan(id, label.trim());
  }

  function remove(id: string) {
    deletePlan(id);
    setSelected((prev) => prev.filter((x) => x !== id));
  }

  async function compare() {
    if (selected.length !== 2) return;
    const aSaved = plans.find((p) => p.id === selected[0]);
    const bSaved = plans.find((p) => p.id === selected[1]);
    if (!aSaved || !bSaved) return;
    setBusy(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        fetchSaved(aSaved, t("regenError")),
        fetchSaved(bSaved, t("regenError")),
      ]);
      setComparison({ a: { label: aSaved.label, plan: a }, b: { label: bSaved.label, plan: b } });
      trackEvent("plan_compared");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("compareError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/plan" className="text-sm font-semibold text-brand">
          {t("backToPlanning")}
        </Link>
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          {t("home")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
        <SyncStatusBadge />
      </div>
      <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

      {plans.length >= 2 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={compare}
            disabled={selected.length !== 2 || busy}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
          >
            {busy ? t("comparing") : t("compareSelected", { count: selected.length })}
          </button>
          {error ? <span className="text-xs text-[var(--danger)]">{error}</span> : null}
        </div>
      ) : null}

      {comparison ? (
        <div className="mt-5">
          <CompareView a={comparison.a} b={comparison.b} />
        </div>
      ) : null}

      <div className="mt-5">
        <SavedPlans
          plans={plans}
          selected={selected}
          onToggle={toggle}
          onRename={rename}
          onDelete={remove}
        />
      </div>
    </main>
  );
}
