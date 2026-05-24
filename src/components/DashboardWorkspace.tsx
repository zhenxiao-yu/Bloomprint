"use client";

import { useMemo, useState } from "react";
import { BriefcaseBusiness, Clock, FileText, Home, Images, Store } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSavedPlans } from "@/lib/plansStore";
import { loadPlanningDraft, type PlanningDraftSnapshot } from "@/lib/workspace/draftStore";

export function DashboardWorkspace() {
  const plans = useSavedPlans();
  const [draft] = useState<PlanningDraftSnapshot | null>(() =>
    typeof window === "undefined" ? null : loadPlanningDraft(),
  );

  const stats = useMemo(
    () => [
      { label: "Active plans", value: plans.length, icon: FileText },
      { label: "Draft photos", value: draft?.photos.length ?? 0, icon: Images },
      { label: "Ready to compare", value: Math.max(0, plans.length - 1), icon: Clock },
      { label: "Workspace mode", value: draft?.session.projectKind === "client_property" ? "Pro" : "Home", icon: Home },
    ],
    [draft, plans.length],
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-7 px-4 py-8 sm:px-6 sm:py-12">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Command center</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-5xl">Welcome back to your yard workspace.</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            Continue drafts, compare versions, manage photos, or switch into pro and store workflows
            without losing progress.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/plan" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong">
            New project
          </Link>
          <Link href="/pro" className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
            Pro dashboard
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4">
            <Icon className="mb-2 size-5 text-brand" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </section>

      {draft ? (
        <section className="rounded-xl border border-brand/25 bg-brand-soft p-5">
          <p className="font-semibold text-brand-strong">Resume your latest planning session</p>
          <p className="mt-1 text-sm text-brand-strong/85">
            {draft.photos.length} photo(s), {draft.analysis?.zones.length ?? 0} detected zone(s), last saved{" "}
            {new Date(draft.session.updatedAt).toLocaleString()}.
          </p>
          <Link href="/plan" className="mt-3 inline-block rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong">
            Resume draft
          </Link>
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-foreground">Recent projects</h2>
            <Link href="/plans" className="text-sm font-semibold text-brand">
              Open saved
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {plans.length > 0 ? (
              plans.slice(0, 5).map((plan) => (
                <Link key={plan.id} href={`/projects/${plan.id}`} className="rounded-lg border border-border p-3 transition hover:border-brand">
                  <p className="text-sm font-semibold text-foreground">{plan.label}</p>
                  <p className="mt-1 text-xs text-muted">
                    {plan.summary.versionLabel ?? "Draft 1"} · ${plan.summary.diyMin.toLocaleString()}-${plan.summary.diyMax.toLocaleString()} · {plan.summary.confidence} confidence
                  </p>
                </Link>
              ))
            ) : (
              <p className="rounded-lg bg-border/40 p-4 text-sm text-muted">No saved projects yet. Start with photos and Bloomprint will keep a draft.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold text-foreground">Modes</h2>
          <div className="mt-4 flex flex-col gap-3">
            <ModeLink icon={Home} href="/plan" title="Homeowner" body="Fix your own yard, save versions, continue later." />
            <ModeLink icon={BriefcaseBusiness} href="/pro" title="Landscaper / Pro" body="Clients, properties, quote-ready material and labor views." />
            <ModeLink icon={Store} href="/plan?mode=staff" title="Store helper" body="Operational recommendations, substitutions, and print/share summary." />
          </div>
        </div>
      </section>
    </main>
  );
}

function ModeLink({
  icon: Icon,
  href,
  title,
  body,
}: {
  icon: typeof Home;
  href: string;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="flex gap-3 rounded-lg border border-border p-3 transition hover:border-brand">
      <Icon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{body}</span>
      </span>
    </Link>
  );
}
