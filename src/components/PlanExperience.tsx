"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { BloomprintPlan, RefinementAdjustment } from "@/domain/models";
import { IntakeForm, type IntakeDefaults, type IntakeValues } from "@/components/IntakeForm";
import { PlanResult, type ViewMode } from "@/components/PlanResult";
import { PhotoPanel } from "@/components/PhotoPanel";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { BUDGETS, REGION_OPTIONS } from "@/lib/uiOptions";
import { saveProfile, useSavedProfileRaw } from "@/lib/profileStore";
import { savePlan } from "@/lib/plansStore";
import { useStores } from "@/lib/storage";
import { buildShareUrl, decodeShare, encodeShare, SHARE_PARAM } from "@/lib/shareLink";
import { buildCareCalendar } from "@/lib/ics";
import { trackEvent } from "@/lib/analytics";
import { readApiError } from "@/lib/apiError";

type GenerateSource = "form" | "demo" | "shared" | "refine" | "accuracy";

type PlanIntake = IntakeValues & { sun?: string; soil?: string; drainage?: string };
type PlanRequest = { intake?: PlanIntake; fixtureKey?: string };

const VIEW_LABELS: { value: ViewMode; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "details", label: "Details" },
  { value: "staff", label: "Staff Helper" },
];

const VERSION_LABELS: Partial<Record<RefinementAdjustment, string>> = {
  cheaper: "Cheaper version",
  "dog-safe": "Dog-safe version",
  "more-flowers": "More flowers version",
  easier: "Easier version",
  "more-privacy": "Store-ready privacy version",
  "stone-to-mulch": "Store-ready version",
};

function versionLabel(adjustments: RefinementAdjustment[]): string {
  const last = adjustments.at(-1);
  return last ? VERSION_LABELS[last] ?? `${last.replace(/-/g, " ")} version` : "Draft 1";
}

interface SavedProfile {
  regionId: string;
  goal: IntakeValues["goal"];
  effortLevel: IntakeValues["effortLevel"];
  budget: number;
  /** Tweaks the user last leaned on — so the next plan feels remembered. */
  rememberedTweaks?: RefinementAdjustment[];
}

function parseSavedProfile(raw: string | null): SavedProfile | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<SavedProfile>;
    if (
      typeof data.regionId === "string" &&
      typeof data.goal === "string" &&
      typeof data.effortLevel === "string" &&
      typeof data.budget === "number"
    ) {
      return data as SavedProfile;
    }
  } catch {
    return null;
  }
  return null;
}

export function PlanExperience() {
  const params = useSearchParams();
  const isDemo = params.get("demo") === "1";
  const staffParam = params.get("mode") === "staff";
  const sharedParam = params.get(SHARE_PARAM);

  // Compute the initial plan request from the URL once (shared link or demo). Done in render via
  // useMemo (not an effect) so we never call setState synchronously inside an effect.
  const boot = useMemo<{
    request: PlanRequest | null;
    adjustments: RefinementAdjustment[];
    source: GenerateSource | null;
    error: string | null;
  }>(() => {
    if (sharedParam) {
      const decoded = decodeShare(sharedParam);
      if (decoded) {
        return {
          request: { intake: decoded.intake as unknown as PlanIntake },
          adjustments: decoded.adjustments,
          source: "shared",
          error: null,
        };
      }
      return {
        request: null,
        adjustments: [],
        source: null,
        error: "That shared link looks invalid — let's start a fresh plan.",
      };
    }
    if (isDemo) {
      return { request: { fixtureKey: "oakville-front-yard" }, adjustments: [], source: "demo", error: null };
    }
    return { request: null, adjustments: [], source: null, error: null };
  }, [sharedParam, isDemo]);

  const [view, setView] = useState<ViewMode>(staffParam ? "staff" : "simple");
  const [step, setStep] = useState<"intake" | "loading" | "result" | "error">(
    boot.request ? "loading" : "intake",
  );
  const [result, setResult] = useState<BloomprintPlan | null>(null);
  const [request, setRequest] = useState<PlanRequest | null>(boot.request);
  const [adjustments, setAdjustments] = useState<RefinementAdjustment[]>(boot.adjustments);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(boot.error);
  const [savedNote, setSavedNote] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const profileRaw = useSavedProfileRaw();
  const profile = useMemo<SavedProfile | null>(
    () => parseSavedProfile(profileRaw),
    [profileRaw],
  );
  const stores = useStores();
  const started = useRef(false);

  const fetchPlan = useCallback(
    async (req: PlanRequest, adj: RefinementAdjustment[], source: GenerateSource) => {
      setBusy(true);
      setError(null);
      setSavedNote(false);
      setShareUrl(null);
      try {
        const res = await fetch("/api/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...req, adjustments: adj }),
        });
        if (!res.ok) throw new Error(await readApiError(res, "We couldn't build that plan."));
        const data: BloomprintPlan = await res.json();
        setResult(data);
        setStep("result");
        if (source === "form" || source === "demo" || source === "shared") {
          trackEvent("plan_generated", { source, goal: data.plan.intake.goal });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setStep("error");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  // Kick off the URL-driven plan (shared link or demo) exactly once. The effect only calls
  // fetchPlan (which updates state from its async callback) — no synchronous setState here.
  useEffect(() => {
    if (started.current || !boot.request || !boot.source) return;
    started.current = true;
    void fetchPlan(boot.request, boot.adjustments, boot.source);
  }, [boot, fetchPlan]);

  // Auto-dismiss the "Saved" confirmation.
  useEffect(() => {
    if (!savedNote) return;
    const t = setTimeout(() => setSavedNote(false), 2500);
    return () => clearTimeout(t);
  }, [savedNote]);

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
    void fetchPlan(req, [], "form");
  }

  function handleRefine(adj: RefinementAdjustment) {
    if (!request) return;
    const active = adjustments.includes(adj);
    const next = active ? adjustments.filter((a) => a !== adj) : [...adjustments, adj];
    setAdjustments(next);
    trackEvent("plan_refined", { adjustment: adj, on: !active });
    void fetchPlan(request, next, "refine");
  }

  function handleAccuracy(field: "sun" | "soil" | "drainage", value: string) {
    if (!request?.intake) return;
    const nextIntake = { ...request.intake, [field]: value };
    const req: PlanRequest = { intake: nextIntake };
    setRequest(req);
    trackEvent("accuracy_upgraded", { field });
    void fetchPlan(req, adjustments, "accuracy");
  }

  function handleSave() {
    if (!result) return;
    const p = result.plan;
    const vLabel = versionLabel(adjustments);
    const label = `${vLabel} — ${p.styleLabel} ${p.intake.goal.replace(/-/g, " ")}`;
    const summary = {
      styleLabel: p.styleLabel,
      goal: p.intake.goal,
      diyMin: p.budget.diyTotal.min,
      diyMax: p.budget.diyTotal.max,
      confidence: p.confidence,
      plantCount: p.plants.length,
      laborHours: p.labor.totalHours,
      privacy: p.plants.some((plant) => plant.role === "screen") ? "screening included" : "not privacy-led",
      maintenance: p.plants.some((plant) => plant.maintenance === "high")
        ? "higher touch"
        : p.plants.every((plant) => plant.maintenance === "low")
          ? "low"
          : "medium",
      heavyWorkWarning: p.equipment.length > 0 || p.storeSearches.some((s) => s.deliveryRecommended),
      versionLabel: vLabel,
    };

    // Always save on-device first — the engagement loop never depends on the cloud (D10).
    savePlan({ label, intake: p.intake, adjustments, summary });
    // Remember the tweaks the user committed to, so the profile feels like it knows them.
    if (profile && adjustments.length > 0) {
      saveProfile({ ...profile, rememberedTweaks: adjustments.slice(0, 5) });
    }
    trackEvent("plan_saved", { goal: p.intake.goal });
    setSavedNote(true);

    // When signed into cloud sync, mirror the save (and any photo) to Supabase — non-blocking.
    if (stores.mode === "cloud") {
      void stores.projects
        .saveProjectWithVersion({
          label,
          versionLabel: vLabel,
          intake: p.intake,
          adjustments,
          summary,
          deterministicPlan: p,
          aiEnhancement: result.enhancement,
          scores: p.scores,
          evidence: p.evidence,
        })
        .then((project) => {
          if (photoUrl) return stores.photos.saveProjectPhoto(project.id, photoUrl).then(() => undefined);
        })
        .catch(() => {
          /* hybrid store already fell back to local + flagged a warning */
        });
    }
  }

  async function handleShare() {
    if (!result) return;
    const url = buildShareUrl(window.location.origin, {
      intake: result.plan.intake,
      adjustments,
    });
    setShareUrl(url);
    trackEvent("plan_shared", { goal: result.plan.intake.goal });
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable — the link is shown for manual copy */
    }
  }

  function handleCalendar(dateStr: string) {
    if (!result || !dateStr) return;
    const start = new Date(`${dateStr}T00:00:00`);
    const ics = buildCareCalendar(result.plan, start);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bloomprint-care-reminders.ics";
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("calendar_added", { goal: result.plan.intake.goal });
    setCalendarOpen(false);
  }

  const storeHref = result
    ? `/plan/store?${SHARE_PARAM}=${encodeShare({ intake: result.plan.intake, adjustments })}`
    : "/plan";
  const today = new Date().toISOString().slice(0, 10);

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
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
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
                  view === v.value ? "bg-brand text-on-strong" : "text-muted hover:text-foreground"
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
          {error ? (
            <div className="rounded-lg bg-[var(--warn)]/10 px-4 py-2 text-xs text-[var(--warn)]">
              {error}
            </div>
          ) : null}
          {profile ? <MemoryBanner profile={profile} /> : null}
          <h1 className="text-2xl font-semibold text-foreground">Let&apos;s plan your yard</h1>
          <IntakeForm defaults={defaults} onSubmit={handleIntake} />
        </div>
      ) : null}

      {step === "loading" ? (
        <div className="space-y-4" aria-live="polite" aria-busy="true">
          <p className="flex items-center gap-2 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Building your plan…
          </p>
          <div className="card overflow-hidden p-6">
            <div className="skeleton h-6 w-2/3" />
            <div className="skeleton mt-3 h-4 w-full" />
            <div className="skeleton mt-2 h-4 w-5/6" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="skeleton h-20" />
              <div className="skeleton h-20" />
            </div>
          </div>
          <div className="card p-5">
            <div className="skeleton h-4 w-1/3" />
            <div className="mt-3 flex gap-2">
              <div className="skeleton h-8 w-24 rounded-full" />
              <div className="skeleton h-8 w-24 rounded-full" />
              <div className="skeleton h-8 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ) : null}

      {step === "error" ? (
        <div className="card space-y-3 p-6">
          <p className="font-medium text-foreground">We couldn&apos;t build that plan.</p>
          <p className="text-sm text-muted">{error}</p>
          <button
            onClick={() => setStep("intake")}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong"
          >
            Start over
          </button>
        </div>
      ) : null}

      {step === "result" && result ? (
        <div className="animate-fade-up">
          {profile ? <MemoryBanner profile={profile} className="mb-4" /> : null}

          {(() => {
            const missing = result.plan.accuracyUpgrades.filter(
              (u) => u.field === "sun" || u.field === "soil" || u.field === "drainage",
            );
            if (missing.length === 0) return null;
            return (
              <div className="mb-4 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-4 py-2.5 text-xs text-[var(--warn)]">
                <span className="font-semibold">
                  This plan is missing {missing.length} detail{missing.length > 1 ? "s" : ""} that affect accuracy:
                </span>{" "}
                {missing.map((m) => m.field).join(", ")}. You can still save, share, and shop —
                answering them (in the plan below) tightens the estimate.
              </div>
            );
          })()}

          {/* Action bar — save, share, history (the engagement loop) */}
          <div className="card mb-4 flex flex-wrap items-center gap-2 p-3 shadow-sm">
            <button
              onClick={handleSave}
              disabled={busy}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
            >
              Save plan
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand disabled:opacity-50"
            >
              Share
            </button>
            <Link
              href={storeHref}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand"
            >
              Take to the store
            </Link>
            <button
              onClick={() => setCalendarOpen((o) => !o)}
              className="hidden rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand sm:inline-flex"
            >
              Care reminders
            </button>
            <Link
              href="/plans"
              className="hidden rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand sm:inline-flex"
            >
              Saved &amp; compare
            </Link>
            <span className="ml-auto">
              <SyncStatusBadge />
            </span>
            {savedNote ? <span className="text-xs font-medium text-brand-strong">✓ Saved</span> : null}
            {shareUrl ? (
              <span className="text-xs text-muted">✓ Link copied — sharable anywhere</span>
            ) : null}
          </div>
          {calendarOpen ? (
            <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
              <label className="text-sm text-foreground">
                Planting start date{" "}
                <input
                  type="date"
                  defaultValue={today}
                  id="care-start"
                  className="card ml-1 p-1.5 text-sm"
                />
              </label>
              <button
                onClick={() =>
                  handleCalendar(
                    (document.getElementById("care-start") as HTMLInputElement | null)?.value ?? today,
                  )
                }
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong hover:bg-brand-strong"
              >
                Download .ics
              </button>
              <span className="text-xs text-muted">
                Adds planting, watering &amp; seasonal reminders to your calendar.
              </span>
            </div>
          ) : null}
          {shareUrl ? (
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="card mb-4 w-full p-2 text-xs text-muted"
              aria-label="Shareable plan link"
            />
          ) : null}

          <div className="mb-4">
            <PhotoPanel
              photoUrl={photoUrl}
              onPhoto={setPhotoUrl}
              cloudSync={stores.mode === "cloud"}
              onApplySun={(sun) => handleAccuracy("sun", sun)}
            />
          </div>

          <PlanResult
            result={result}
            view={view}
            adjustments={adjustments}
            busy={busy}
            onRefine={handleRefine}
            onAccuracy={handleAccuracy}
            photoUrl={photoUrl}
          />
          <div className="mt-6">
            <Link href="/plan" className="text-sm font-semibold text-brand">
              ← Plan another yard
            </Link>
          </div>
        </div>
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
  const tweaks = (profile.rememberedTweaks ?? []).map((t) => t.replace(/-/g, " "));
  return (
    <div className={`rounded-lg bg-brand-soft px-4 py-3 text-xs text-brand-strong ${className}`}>
      <span className="font-semibold">Using your saved preferences:</span>
      <span className="ml-1">{prefs.map((p) => `✓ ${p}`).join("  ·  ")}</span>
      {tweaks.length > 0 ? (
        <span className="mt-1 block opacity-80">Remembers your tweaks: {tweaks.join(", ")}</span>
      ) : null}
    </div>
  );
}
