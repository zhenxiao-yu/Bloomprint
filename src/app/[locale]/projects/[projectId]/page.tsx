"use client";

import { use, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { getSavedPlan, type SavedPlan } from "@/lib/plansStore";
import { encodeShare, SHARE_PARAM } from "@/lib/shareLink";

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Saved plans live in localStorage; read after mount so server and first client
  // render agree (no hydration flip) and `projectId` is resolved from the params promise.
  useEffect(() => {
    const id = setTimeout(() => {
      setPlan(getSavedPlan(projectId));
      setLoaded(true);
    }, 0);
    return () => clearTimeout(id);
  }, [projectId]);

  if (!loaded) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
        <div className="h-9 w-56 animate-pulse rounded bg-border" />
        <div className="h-28 w-full animate-pulse rounded-xl bg-border" />
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-semibold text-foreground">Project not found</h1>
        <p className="text-sm text-muted">This project may have been deleted from this device.</p>
        <Link href="/dashboard" className="text-sm font-semibold text-brand">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/dashboard" className="text-sm font-semibold text-brand">
        Back to dashboard
      </Link>
      <header className="rounded-xl border border-border bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Project</p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">{plan.label}</h1>
        <p className="mt-2 text-sm text-muted">
          {plan.summary.versionLabel ?? "Draft 1"} · {plan.summary.confidence} confidence · {plan.summary.plantCount} plant types
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <CardStat label="Estimated DIY cost" value={`$${plan.summary.diyMin.toLocaleString()}-$${plan.summary.diyMax.toLocaleString()}`} />
        <CardStat label="Labor hours" value={`${plan.summary.laborHours ?? "?"}h`} />
        <CardStat label="Maintenance" value={plan.summary.maintenance ?? "unknown"} />
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold text-foreground">Plan versions</h2>
        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold text-foreground">{plan.summary.versionLabel ?? "Draft 1"}</p>
          <p className="mt-1 text-muted">
            Saved {new Date(plan.createdAt).toLocaleString()} · {plan.adjustments.length} refinement(s)
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/plan?${SHARE_PARAM}=${encodeShare({ intake: plan.intake, adjustments: plan.adjustments })}`} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong">
            Open plan
          </Link>
          <Link href="/plans" className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold">
            Compare
          </Link>
        </div>
      </section>
    </main>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
