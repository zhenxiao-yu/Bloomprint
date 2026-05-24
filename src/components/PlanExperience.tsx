"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { BloomprintPlan, RefinementAdjustment } from "@/domain/models";
import { IntakeForm, type IntakeDefaults, type IntakeValues } from "@/components/IntakeForm";
import { PlanResult, type ViewMode } from "@/components/PlanResult";
import { PhotoPanel } from "@/components/PhotoPanel";
import { PhotoFirstPlanning } from "@/components/PhotoFirstPlanning";
import { PlanBuildLoading } from "@/components/PlanBuildLoading";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { BUDGETS, REGION_OPTIONS } from "@/lib/uiOptions";
import { saveProfile, useSavedProfileRaw } from "@/lib/profileStore";
import { savePlan } from "@/lib/plansStore";
import { useStores } from "@/lib/storage";
import { buildShareUrl, decodeShare, encodeShare, SHARE_PARAM } from "@/lib/shareLink";
import { buildCareCalendar } from "@/lib/ics";
import { trackEvent } from "@/lib/analytics";
import { readApiError } from "@/lib/apiError";
import {
  clearActiveSession,
  createPlanningDraft,
  loadPlanningDraft,
  savePlanningDraft,
  type PlanningDraftSnapshot,
} from "@/lib/workspace/draftStore";
import type { PhotoAnalysisResult, PhotoAsset, ProjectKind } from "@/lib/workspace/types";

type GenerateSource = "form" | "demo" | "shared" | "refine" | "accuracy";

type PlanIntake = IntakeValues & { sun?: string; soil?: string; drainage?: string };
type PlanRequest = { intake?: PlanIntake; fixtureKey?: string };

const VIEW_VALUES: { value: ViewMode; key: "simple" | "details" | "staff" }[] = [
  { value: "simple", key: "simple" },
  { value: "details", key: "details" },
  { value: "staff", key: "staff" },
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
  return last ? (VERSION_LABELS[last] ?? `${last.replace(/-/g, " ")} version`) : "Draft 1";
}

interface SavedProfile {
  regionId: string;
  goal: IntakeValues["goal"];
  effortLevel: IntakeValues["effortLevel"];
  budget: number;
  /** Tweaks the user last leaned on — so the next plan feels remembered. */
  rememberedTweaks?: RefinementAdjustment[];
  /** Measured bed area carried over from the Yard Map. */
  areaSqft?: number;
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
  const t = useTranslations("Plan");
  const tModes = useTranslations("Modes");
  const params = useSearchParams();
  const isDemo = params.get("demo") === "1";
  const staffParam = params.get("mode") === "staff";
  const sharedParam = params.get(SHARE_PARAM);
  // A measured bed area handed back from the Yard Map (sharpens the next plan).
  const areaParamRaw = Number(params.get("area"));
  const measuredArea = Number.isFinite(areaParamRaw) && areaParamRaw > 0 ? areaParamRaw : null;

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
        error: t("invalidShareLink"),
      };
    }
    if (isDemo) {
      return {
        request: { fixtureKey: "oakville-front-yard" },
        adjustments: [],
        source: "demo",
        error: null,
      };
    }
    return { request: null, adjustments: [], source: null, error: null };
  }, [sharedParam, isDemo, t]);

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
  const [prepComplete, setPrepComplete] = useState(Boolean(boot.request));
  const [draft, setDraft] = useState<PlanningDraftSnapshot>(() =>
    createPlanningDraft(staffParam ? "store_customer" : "my_home"),
  );
  const [recoveryDraft, setRecoveryDraft] = useState<PlanningDraftSnapshot | null>(null);
  const [autosaveState, setAutosaveState] = useState<"idle" | "saving" | "saved" | "unsaved">(
    "idle",
  );
  const profileRaw = useSavedProfileRaw();
  const profile = useMemo<SavedProfile | null>(() => parseSavedProfile(profileRaw), [profileRaw]);
  const stores = useStores();
  const started = useRef(false);

  useEffect(() => {
    if (boot.request) return;
    const existing = loadPlanningDraft();
    if (existing && Date.now() - existing.session.updatedAt < 1000 * 60 * 60 * 24 * 14) {
      const id = setTimeout(() => setRecoveryDraft(existing), 0);
      return () => clearTimeout(id);
    }
  }, [boot.request]);

  useEffect(() => {
    if (boot.request) return;
    const id = setTimeout(() => {
      savePlanningDraft(draft);
      setAutosaveState("saved");
    }, 450);
    return () => {
      clearTimeout(id);
      setAutosaveState("unsaved");
    };
  }, [boot.request, draft]);

  useEffect(() => {
    if (prepComplete && step === "intake") return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (autosaveState === "unsaved" || autosaveState === "saving") {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [autosaveState, prepComplete, step]);

  function updateDraft(mutator: (current: PlanningDraftSnapshot) => PlanningDraftSnapshot) {
    setAutosaveState("unsaved");
    setDraft(mutator);
  }

  function handleProjectKind(kind: ProjectKind) {
    updateDraft((current) => ({
      ...current,
      session: { ...current.session, projectKind: kind, updatedAt: Date.now() },
    }));
    if (kind === "store_customer") setView("staff");
  }

  function handleDraftPhotos(photos: PhotoAsset[]) {
    updateDraft((current) => ({
      ...current,
      photos,
      session: {
        ...current.session,
        photoIds: photos.map((p) => p.id),
        currentStep: "photos",
        updatedAt: Date.now(),
      },
    }));
    const first = photos[0]?.previewUrl ?? null;
    if (first) setPhotoUrl(first);
  }

  const handleDraftAnalysis = useCallback((analysis: PhotoAnalysisResult | null) => {
    setDraft((current) => ({
      ...current,
      analysis,
      session: {
        ...current.session,
        status: analysis ? "ready" : "draft",
        currentStep: analysis ? "analysis" : current.session.currentStep,
        updatedAt: Date.now(),
      },
    }));
    setAutosaveState("unsaved");
  }, []);

  function resumeDraft(snapshot: PlanningDraftSnapshot) {
    setDraft(snapshot);
    setPhotoUrl(snapshot.photos[0]?.previewUrl ?? null);
    setPrepComplete(
      snapshot.session.currentStep === "details" || snapshot.session.currentStep === "plan",
    );
    setRecoveryDraft(null);
    setAutosaveState("saved");
  }

  function discardDraft() {
    clearActiveSession();
    const fresh = createPlanningDraft(staffParam ? "store_customer" : "my_home");
    setDraft(fresh);
    setRecoveryDraft(null);
    setPrepComplete(false);
    setPhotoUrl(null);
  }

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
        if (!res.ok) throw new Error(await readApiError(res, t("buildError")));
        const data: BloomprintPlan = await res.json();
        setResult(data);
        setStep("result");
        if (source === "form" || source === "demo" || source === "shared") {
          trackEvent("plan_generated", { source, goal: data.plan.intake.goal });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : t("somethingWrong"));
        setStep("error");
      } finally {
        setBusy(false);
      }
    },
    [t],
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
    const intakeValues: IntakeValues = {
      ...values,
      hasPhoto: values.hasPhoto || draft.photos.some((photo) => photo.quality !== "unusable"),
    };
    const next: SavedProfile = {
      regionId: intakeValues.regionId,
      goal: intakeValues.goal,
      effortLevel: intakeValues.effortLevel,
      budget: intakeValues.budget,
      areaSqft: intakeValues.areaSqft,
    };
    saveProfile(next);
    const req: PlanRequest = { intake: intakeValues };
    updateDraft((current) => ({
      ...current,
      session: {
        ...current.session,
        currentStep: "plan",
        autosaveData: { intake: intakeValues },
        updatedAt: Date.now(),
      },
    }));
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
      privacy: p.plants.some((plant) => plant.role === "screen")
        ? "screening included"
        : "not privacy-led",
      maintenance: p.plants.some((plant) => plant.maintenance === "high")
        ? "higher touch"
        : p.plants.every((plant) => plant.maintenance === "low")
          ? "low"
          : "medium",
      heavyWorkWarning:
        p.equipment.length > 0 || p.storeSearches.some((s) => s.deliveryRecommended),
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
          if (photoUrl)
            return stores.photos.saveProjectPhoto(project.id, photoUrl).then(() => undefined);
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

  const defaults: IntakeDefaults | undefined =
    profile || measuredArea
      ? {
          regionId: profile?.regionId,
          goal: profile?.goal,
          effortLevel: profile?.effortLevel,
          budgetIndex: profile
            ? Math.max(
                0,
                BUDGETS.findIndex((b) => b.budget === profile.budget),
              )
            : undefined,
          areaSqft: measuredArea ?? profile?.areaSqft,
        }
      : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-brand">
          {t("back")}
        </Link>
        {step === "result" ? (
          <div className="flex gap-1 rounded-full border border-border p-0.5 text-xs">
            {VIEW_VALUES.map((v) => (
              <button
                key={v.value}
                onClick={() => setView(v.value)}
                aria-pressed={view === v.value}
                className={`rounded-full px-3 py-1 transition ${
                  view === v.value ? "bg-brand text-on-strong" : "text-muted hover:text-foreground"
                } ${v.value === "staff" && !staffParam ? "opacity-70" : ""}`}
              >
                {tModes(v.key)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {step === "intake" ? (
        <div className="space-y-5">
          {recoveryDraft && !prepComplete ? (
            <div className="rounded-xl border border-brand/25 bg-brand-soft p-4 text-sm text-brand-strong">
              <p className="font-semibold">
                We found an unsaved plan from{" "}
                {new Date(recoveryDraft.session.updatedAt).toLocaleTimeString()}.
              </p>
              <p className="mt-1">
                Resume your photos and assumptions, save it as a project, or discard it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => resumeDraft(recoveryDraft)}
                  className="rounded-full bg-brand px-4 py-1.5 text-xs font-semibold text-on-strong"
                >
                  Resume plan
                </button>
                <button
                  onClick={() =>
                    resumeDraft({
                      ...recoveryDraft,
                      session: { ...recoveryDraft.session, id: crypto.randomUUID() },
                    })
                  }
                  className="rounded-full border border-brand px-4 py-1.5 text-xs font-semibold"
                >
                  Save as new project
                </button>
                <button
                  onClick={discardDraft}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : null}
          {error ? (
            <div className="rounded-lg bg-[var(--warn)]/10 px-4 py-2 text-xs text-[var(--warn)]">
              {error}
            </div>
          ) : null}
          {!prepComplete ? (
            <>
              <PhotoFirstPlanning
                sessionId={draft.session.id}
                projectKind={draft.session.projectKind}
                photos={draft.photos}
                analysis={draft.analysis}
                onProjectKind={handleProjectKind}
                onPhotos={handleDraftPhotos}
                onAnalysis={handleDraftAnalysis}
                onContinue={() => {
                  updateDraft((current) => ({
                    ...current,
                    session: { ...current.session, currentStep: "details", updatedAt: Date.now() },
                  }));
                  setPrepComplete(true);
                }}
                onSkip={() => {
                  updateDraft((current) => ({
                    ...current,
                    session: { ...current.session, currentStep: "details", updatedAt: Date.now() },
                  }));
                  setPrepComplete(true);
                }}
              />
              <p className="px-1 text-xs text-muted">
                {autosaveState === "saving"
                  ? "Saving..."
                  : autosaveState === "saved"
                    ? "Draft saved locally. You can safely leave and continue later."
                    : "Unsaved changes"}
              </p>
            </>
          ) : (
            <>
              {profile ? <MemoryBanner profile={profile} t={t} /> : null}
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  Confirmed photos and assumptions
                </p>
                <p className="mt-1 text-sm text-muted">
                  {draft.photos.length > 0
                    ? `${draft.photos.length} photo(s) attached. ${draft.analysis?.zones.length ?? 0} planning zone(s) estimated.`
                    : "Continuing without photos. You can still generate a buildable plan."}
                </p>
                <button
                  type="button"
                  onClick={() => setPrepComplete(false)}
                  className="mt-3 rounded-full border border-border px-3 py-1 text-xs font-semibold"
                >
                  Edit photos
                </button>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">{t("intakeTitle")}</h1>
              {measuredArea ? (
                <div className="rounded-lg bg-brand-soft px-4 py-2 text-xs text-brand-strong">
                  {t("measuredAreaNote", { area: Math.round(measuredArea) })}
                </div>
              ) : null}
              <IntakeForm defaults={defaults} onSubmit={handleIntake} />
            </>
          )}
        </div>
      ) : null}

      {step === "loading" ? (
        <div className="space-y-4" aria-live="polite" aria-busy="true">
          <PlanBuildLoading />
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
          <p className="font-medium text-foreground">{t("errorTitle")}</p>
          <p className="text-sm text-muted">{error}</p>
          <button
            onClick={() => setStep("intake")}
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong"
          >
            {t("startOver")}
          </button>
        </div>
      ) : null}

      {step === "result" && result ? (
        <div className="animate-fade-up">
          {profile ? <MemoryBanner profile={profile} className="mb-4" t={t} /> : null}

          {(() => {
            const missing = result.plan.accuracyUpgrades.filter(
              (u) => u.field === "sun" || u.field === "soil" || u.field === "drainage",
            );
            if (missing.length === 0) return null;
            return (
              <div className="mb-4 rounded-lg border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-4 py-2.5 text-xs text-[var(--warn)]">
                <span className="font-semibold">
                  {t("missingDetails", {
                    count: missing.length,
                    plural: missing.length > 1 ? "s" : "",
                  })}
                </span>{" "}
                {missing.map((m) => m.field).join(", ")}
                {t("missingDetailsTail")}
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
              {t("savePlan")}
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand disabled:opacity-50"
            >
              {t("share")}
            </button>
            <Link
              href={storeHref}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand"
            >
              {t("takeToStore")}
            </Link>
            <button
              onClick={() => setCalendarOpen((o) => !o)}
              className="hidden rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand sm:inline-flex"
            >
              {t("careReminders")}
            </button>
            <Link
              href="/plans"
              className="hidden rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand sm:inline-flex"
            >
              {t("savedAndCompare")}
            </Link>
            <span className="ml-auto">
              <SyncStatusBadge />
            </span>
            {savedNote ? (
              <span className="text-xs font-medium text-brand-strong">{t("savedConfirm")}</span>
            ) : null}
            {shareUrl ? <span className="text-xs text-muted">{t("linkCopied")}</span> : null}
          </div>
          {calendarOpen ? (
            <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
              <label className="text-sm text-foreground">
                {t("plantingStart")}{" "}
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
                    (document.getElementById("care-start") as HTMLInputElement | null)?.value ??
                      today,
                  )
                }
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong hover:bg-brand-strong"
              >
                {t("downloadIcs")}
              </button>
              <span className="text-xs text-muted">{t("calendarNote")}</span>
            </div>
          ) : null}
          {shareUrl ? (
            <input
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="card mb-4 w-full p-2 text-xs text-muted"
              aria-label={t("shareAria")}
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
              {t("planAnother")}
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

function MemoryBanner({
  profile,
  className = "",
  t,
}: {
  profile: SavedProfile;
  className?: string;
  t: ReturnType<typeof useTranslations<"Plan">>;
}) {
  const region =
    REGION_OPTIONS.find((r) => r.value === profile.regionId)?.label ?? profile.regionId;
  const prefs = [
    GOAL_PREF[profile.goal] ?? "a good plan",
    EFFORT_PREF[profile.effortLevel] ?? "moderate effort",
    `around $${profile.budget.toLocaleString()} budget`,
    region,
  ];
  const tweaks = (profile.rememberedTweaks ?? []).map((tw) => tw.replace(/-/g, " "));
  return (
    <div className={`rounded-lg bg-brand-soft px-4 py-3 text-xs text-brand-strong ${className}`}>
      <span className="font-semibold">{t("savedPrefsTitle")}</span>
      <span className="ml-1">{prefs.map((p) => `✓ ${p}`).join("  ·  ")}</span>
      {tweaks.length > 0 ? (
        <span className="mt-1 block opacity-80">
          {t("remembersTweaks", { tweaks: tweaks.join(", ") })}
        </span>
      ) : null}
    </div>
  );
}
