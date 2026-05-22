"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BloomprintPlan, RefinementAdjustment } from "@/domain/models";
import { IntakeForm, type IntakeDefaults, type IntakeValues } from "@/components/IntakeForm";
import { PlanResult, type ViewMode } from "@/components/PlanResult";
import { BUDGETS, REGION_OPTIONS } from "@/lib/uiOptions";
import { saveProfile, useSavedProfileRaw } from "@/lib/profileStore";

type PlanIntake = IntakeValues & { sun?: string; soil?: string; drainage?: string };
type PlanRequest = { intake?: PlanIntake; fixtureKey?: string };

const VIEW_LABELS: { value: ViewMode; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "details", label: "Details" },
  { value: "staff", label: "Staff Helper" },
];

interface SavedProfile {
  regionId: string;
  goal: IntakeValues["goal"];
  effortLevel: IntakeValues["effortLevel"];
  budget: number;
}

export function PlanExperience() {
  const params = useSearchParams();
  const isDemo = params.get("demo") === "1";
  const staffParam = params.get("mode") === "staff";

  const [view, setView] = useState<ViewMode>(staffParam ? "staff" : "simple");
  const [step, setStep] = useState<"intake" | "loading" | "result" | "error">(
    isDemo ? "loading" : "intake",
  );
  const [result, setResult] = useState<BloomprintPlan | null>(null);
  const [request, setRequest] = useState<PlanRequest | null>(null);
  const [adjustments, setAdjustments] = useState<RefinementAdjustment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const profileRaw = useSavedProfileRaw();
  const profile = useMemo<SavedProfile | null>(
    () => (profileRaw ? (JSON.parse(profileRaw) as SavedProfile) : null),
    [profileRaw],
  );
  const started = useRef(false);

  const fetchPlan = useCallback(
    async (req: PlanRequest, adj: RefinementAdjustment[]) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...req, adjustments: adj }),
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data: BloomprintPlan = await res.json();
        setResult(data);
        setStep("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setStep("error");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Kick off the demo once (URL-driven, so an effect is appropriate).
  useEffect(() => {
    if (isDemo && !started.current) {
      started.current = true;
      const req = { fixtureKey: "oakville-front-yard" };
      setRequest(req);
      void fetchPlan(req, []);
    }
  }, [isDemo, fetchPlan]);

  function handleIntake(values: IntakeValues) {
    const next: SavedProfile = {
      regionId: values.regionId,
      goal: values.goal,
      effortLevel: values.effortLevel,
      budget: values.budget,
    };
    saveProfile(next);
    const req: PlanRequest = { intake: values };
    setRequest(req);
    setAdjustments([]);
    setStep("loading");
    void fetchPlan(req, []);
  }

  function handleRefine(adj: RefinementAdjustment) {
    if (!request) return;
    const next = adjustments.includes(adj)
      ? adjustments.filter((a) => a !== adj)
      : [...adjustments, adj];
    setAdjustments(next);
    void fetchPlan(request, next);
  }

  function handleAccuracy(field: "sun" | "soil" | "drainage", value: string) {
    if (!request?.intake) return;
    const nextIntake = { ...request.intake, [field]: value };
    const req: PlanRequest = { intake: nextIntake };
    setRequest(req);
    void fetchPlan(req, adjustments);
  }

  const defaults: IntakeDefaults | undefined = profile
    ? {
        regionId: profile.regionId,
        goal: profile.goal,
        effortLevel: profile.effortLevel,
        budgetIndex: Math.max(
          0,
          BUDGETS.findIndex((b) => b.budget === profile.budget),
        ),
      }
    : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-brand">
          ← Bloomprint
        </Link>
        {step === "result" ? (
          <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs">
            {VIEW_LABELS.map((v) => (
              <button
                key={v.value}
                onClick={() => setView(v.value)}
                aria-pressed={view === v.value}
                className={`rounded-full px-3 py-1 transition ${
                  view === v.value ? "bg-brand text-white" : "text-muted hover:text-foreground"
                } ${v.value === "staff" && !staffParam ? "opacity-70" : ""}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {step === "intake" ? (
        <div className="space-y-5">
          {profile ? <MemoryBanner profile={profile} /> : null}
          <h1 className="text-2xl font-semibold text-foreground">Let&apos;s plan your yard</h1>
          <IntakeForm defaults={defaults} onSubmit={handleIntake} />
        </div>
      ) : null}

      {step === "loading" ? (
        <div className="card flex items-center gap-3 p-8 text-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Building your plan…
        </div>
      ) : null}

      {step === "error" ? (
        <div className="card space-y-3 p-6">
          <p className="font-medium text-foreground">We couldn&apos;t build that plan.</p>
          <p className="text-sm text-muted">{error}</p>
          <button
            onClick={() => setStep("intake")}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white"
          >
            Start over
          </button>
        </div>
      ) : null}

      {step === "result" && result ? (
        <>
          {profile ? <MemoryBanner profile={profile} className="mb-4" /> : null}
          <PlanResult
            result={result}
            view={view}
            adjustments={adjustments}
            busy={busy}
            onRefine={handleRefine}
            onAccuracy={handleAccuracy}
          />
          <div className="mt-6">
            <Link href="/plan" className="text-sm font-semibold text-brand">
              ← Plan another yard
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}

const GOAL_PREF: Record<string, string> = {
  privacy: "likes a private, enclosed yard",
  "curb-appeal": "wants strong curb appeal",
  "low-maintenance": "prefers low-maintenance layouts",
  pollinator: "loves pollinator-friendly planting",
  "shade-tolerant": "planting in shadier spots",
  general: "open to a well-rounded plan",
};

const EFFORT_PREF: Record<string, string> = {
  light: "light DIY effort",
  moderate: "moderate DIY effort",
  heavy: "happy with heavy DIY",
  "hire-help": "may hire help",
};

function MemoryBanner({ profile, className = "" }: { profile: SavedProfile; className?: string }) {
  const region = REGION_OPTIONS.find((r) => r.value === profile.regionId)?.label ?? profile.regionId;
  const prefs = [
    GOAL_PREF[profile.goal] ?? "a good plan",
    EFFORT_PREF[profile.effortLevel] ?? "moderate effort",
    `around $${profile.budget.toLocaleString()} budget`,
    region,
  ];
  return (
    <div className={`rounded-lg bg-brand-soft px-4 py-3 text-xs text-brand-strong ${className}`}>
      <span className="font-semibold">Using your saved preferences:</span>
      <span className="ml-1">{prefs.map((p) => `✓ ${p}`).join("  ·  ")}</span>
    </div>
  );
}
