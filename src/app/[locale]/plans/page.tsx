"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { BloomprintPlan } from "@/domain/models";
import { deletePlan, useSavedPlans, type SavedPlan } from "@/lib/plansStore";
import { loadPlanningDraft, type PlanningDraftSnapshot } from "@/lib/workspace/draftStore";
import { SavedPlans } from "@/components/SavedPlans";
import { CompareView } from "@/components/CompareView";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { trackEvent } from "@/lib/analytics";
import { readApiError } from "@/lib/apiError";
import { Button } from "@/components/ui/button";
import { BorderBeam } from "@/components/ui/border-beam";
import { ArrowRight, GitCompare } from "lucide-react";

type Entry = { label: string; plan: BloomprintPlan };

const MAX_COMPARE = 3;

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
  const tNav = useTranslations("Nav");
  const tDash = useTranslations("Dashboard");
  const plans = useSavedPlans();
  // The merged hub also surfaces any in-progress draft so "continue where I left off"
  // lives in the same place as the saved library.
  const [draft] = useState<PlanningDraftSnapshot | null>(() =>
    typeof window === "undefined" ? null : loadPlanningDraft(),
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<Entry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setComparison(null);
    // Select up to MAX_COMPARE; selecting a 4th drops the oldest (FIFO).
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_COMPARE
          ? [...prev.slice(1), id]
          : [...prev, id],
    );
  }

  // Rename writes + toasts inside SavedPlans (via a Dialog); here we just drop any
  // stale comparison so the renamed label re-renders cleanly.
  function rename() {
    setComparison(null);
  }

  function remove(id: string) {
    deletePlan(id);
    setSelected((prev) => prev.filter((x) => x !== id));
    setComparison(null);
  }

  async function compare() {
    const chosen = selected
      .map((id) => plans.find((p) => p.id === id))
      .filter((p): p is SavedPlan => Boolean(p));
    if (chosen.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const built = await Promise.all(
        chosen.map(async (saved) => ({
          label: saved.label,
          plan: await fetchSaved(saved, t("regenError")),
        })),
      );
      setComparison(built);
      trackEvent("plan_compared", { count: built.length });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("compareError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-wide flex-1 py-10 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="display-lg text-foreground">{tNav("myPlans")}</h1>
        <SyncStatusBadge />
      </div>
      <p className="lead mt-1 max-w-2xl text-muted-foreground">{t("subtitle")}</p>

      {/* Continue an in-progress draft — same home as the saved library. */}
      {draft ? (
        <div className="relative mt-5 overflow-hidden rounded-2xl border border-brand/25 bg-brand-soft p-5 sm:p-6">
          <BorderBeam size={120} duration={7} colorFrom="var(--brand)" colorTo="var(--brand-strong)" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="title-3 text-brand-strong">{tDash("resumeTitle")}</p>
              <p className="mt-1 text-sm text-brand-strong/85">
                {tDash("resumeMeta", {
                  photos: draft.photos.length,
                  zones: draft.analysis?.zones.length ?? 0,
                  when: new Date(draft.session.updatedAt).toLocaleString(),
                })}
              </p>
            </div>
            <Button asChild className="shrink-0 rounded-full bg-brand text-on-strong hover:bg-brand-strong">
              <Link href="/plan">
                {tDash("resumeCta")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {plans.length >= 2 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={compare}
            disabled={selected.length < 2 || busy}
            className="rounded-full bg-brand text-on-strong hover:bg-brand-strong"
          >
            <GitCompare className="size-4" aria-hidden />
            {busy ? t("comparing") : t("compareSelected", { count: selected.length })}
          </Button>
          {error ? <span className="text-sm text-[var(--danger)]">{error}</span> : null}
        </div>
      ) : null}

      {comparison ? (
        <div className="mt-5">
          <CompareView entries={comparison} />
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
