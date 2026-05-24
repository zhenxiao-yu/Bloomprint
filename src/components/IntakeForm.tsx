"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  HelpCircle,
  Image as ImageIcon,
  MapPin,
  Ruler,
  Sparkles,
  Sun,
  Wallet,
  Wrench,
} from "lucide-react";
import type {
  Drainage,
  EffortLevel,
  Measurement,
  ProblemType,
  ProjectGoal,
  ProjectScope,
  SoilType,
  StyleFamily,
  SunExposure,
} from "@/domain/models";
import {
  AREAS,
  BUDGETS,
  DRAINAGE_OPTIONS,
  EFFORTS,
  GOALS,
  HELPER_OPTIONS,
  PROBLEM_OPTIONS,
  REGION_OPTIONS,
  SCOPE_OPTIONS,
  SOIL_OPTIONS,
  STYLE_OPTIONS,
  SUN_OPTIONS,
} from "@/lib/uiOptions";
import type { PhotoAnalysisResult } from "@/lib/workspace/types";

export interface IntakeValues {
  regionId: string;
  locationQuery?: string;
  goal: ProjectGoal;
  scope?: ProjectScope;
  problemType?: ProblemType;
  budget: number;
  budgetStyle: "budget" | "balanced" | "premium";
  effortLevel: EffortLevel;
  areaType?: string;
  /** Measured/known planting-bed area in sq ft. */
  areaSqft?: number;
  measurement?: Measurement;
  sun?: SunExposure;
  soil?: SoilType;
  drainage?: Drainage;
  hasPetsOrKids?: boolean;
  helpers?: number;
  stylePreference?: StyleFamily;
  hasPhoto: boolean;
}

export interface IntakeDefaults {
  regionId?: string;
  goal?: ProjectGoal;
  budgetIndex?: number;
  effortLevel?: EffortLevel;
  /** Prefill from the Yard Map's measured bed area. */
  areaSqft?: number;
}

const formSchema = z.object({
  regionId: z.string().min(1),
  locationQuery: z.string().optional(),
  goal: z.string(),
  scope: z.string().optional(),
  problemType: z.string().optional(),
  budgetIndex: z.number().int().min(0),
  effortLevel: z.string(),
  areaType: z.string().optional(),
  areaSqft: z.string().optional(),
  lengthVal: z.string().optional(),
  widthVal: z.string().optional(),
  dimUnit: z.string().optional(),
  sun: z.string().optional(),
  soil: z.string().optional(),
  drainage: z.string().optional(),
  hasPetsOrKids: z.boolean().optional(),
  helpers: z.string().optional(),
  stylePreference: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const STEP_KEYS = ["goal", "basics", "accuracy"] as const;

type StepKey = (typeof STEP_KEYS)[number];

export function IntakeForm({
  defaults,
  onSubmit,
  photoAnalysis,
  photoPreviewUrl,
  photoCount = 0,
}: {
  defaults?: IntakeDefaults;
  onSubmit: (values: IntakeValues) => void;
  photoAnalysis?: PhotoAnalysisResult | null;
  photoPreviewUrl?: string | null;
  photoCount?: number;
}) {
  const t = useTranslations("Intake");
  const tc = useTranslations("Common");
  const to = useTranslations("Options");
  const [stepIndex, setStepIndex] = useState(0);

  const { register, handleSubmit, control, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regionId: defaults?.regionId ?? REGION_OPTIONS[0].value,
      locationQuery: "",
      goal: defaults?.goal ?? "general",
      scope: "section_plan",
      problemType: "",
      budgetIndex: defaults?.budgetIndex ?? 1,
      effortLevel: defaults?.effortLevel ?? "moderate",
      areaType: "",
      areaSqft: defaults?.areaSqft ? String(Math.round(defaults.areaSqft)) : "",
      lengthVal: "",
      widthVal: "",
      dimUnit: "ft",
      sun: "unknown",
      soil: "unknown",
      drainage: "unknown",
      hasPetsOrKids: false,
      helpers: "",
      stylePreference: "",
    },
  });

  const values = useWatch({ control });
  const sharpened =
    (values.areaType ? 1 : 0) +
    (values.areaSqft ? 1 : 0) +
    (values.sun && values.sun !== "unknown" ? 1 : 0) +
    (values.soil && values.soil !== "unknown" ? 1 : 0) +
    (values.drainage && values.drainage !== "unknown" ? 1 : 0) +
    (values.hasPetsOrKids ? 1 : 0) +
    (values.helpers ? 1 : 0) +
    (values.stylePreference ? 1 : 0);

  const photoHints = useMemo(() => buildPhotoHints(photoAnalysis), [photoAnalysis]);
  const activeStep = STEP_KEYS[stepIndex];

  function submit(raw: FormValues) {
    const b = BUDGETS[raw.budgetIndex];
    const area = raw.areaSqft ? Number(raw.areaSqft) : NaN;
    const helpers = raw.helpers ? Number(raw.helpers) : NaN;
    const length = raw.lengthVal ? Number(raw.lengthVal) : NaN;
    const width = raw.widthVal ? Number(raw.widthVal) : NaN;
    const measurement: Measurement | undefined =
      Number.isFinite(length) && length > 0 && Number.isFinite(width) && width > 0
        ? {
            length,
            width,
            unit: raw.dimUnit === "m" ? "m" : "ft",
            source: "manual",
            confidence: "good",
          }
        : undefined;

    onSubmit({
      regionId: raw.regionId,
      locationQuery: raw.locationQuery?.trim() || undefined,
      goal: raw.goal as ProjectGoal,
      scope: (raw.scope as ProjectScope) || undefined,
      problemType: (raw.problemType as ProblemType) || undefined,
      budget: b.budget,
      budgetStyle: b.budgetStyle,
      effortLevel: raw.effortLevel as EffortLevel,
      areaType: raw.areaType || undefined,
      areaSqft: Number.isFinite(area) && area > 0 ? area : undefined,
      measurement,
      sun: (raw.sun as SunExposure) || undefined,
      soil: (raw.soil as SoilType) || undefined,
      drainage: (raw.drainage as Drainage) || undefined,
      hasPetsOrKids: raw.hasPetsOrKids || undefined,
      helpers: Number.isFinite(helpers) ? helpers : undefined,
      stylePreference: (raw.stylePreference as StyleFamily) || undefined,
      hasPhoto: photoCount > 0,
    });
  }

  function nextStep() {
    setStepIndex((current) => Math.min(current + 1, STEP_KEYS.length - 1));
  }

  function previousStep() {
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function applyPhotoHints() {
    if (photoHints.suggestedArea) setValue("areaType", photoHints.suggestedArea);
    if (photoHints.suggestedGoal) setValue("goal", photoHints.suggestedGoal);
    if (photoHints.suggestedSun) setValue("sun", photoHints.suggestedSun);
    setStepIndex(2);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-5">
      <section className="card overflow-hidden">
        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_220px] sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              {t("detailsKicker")}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {t(`steps.${activeStep}.title`)}
            </h2>
            <p className="mt-1 text-sm text-muted">{t(`steps.${activeStep}.body`)}</p>
          </div>
          <StepVisual step={activeStep} photoPreviewUrl={photoPreviewUrl} />
        </div>
        <PlanStepper active={stepIndex} setActive={setStepIndex} t={t} />
      </section>

      <PhotoContextCard
        photoAnalysis={photoAnalysis}
        photoPreviewUrl={photoPreviewUrl}
        photoCount={photoCount}
        hints={photoHints}
        onApply={applyPhotoHints}
        t={t}
      />

      {activeStep === "goal" ? (
        <GoalStep control={control} setValue={setValue} t={t} to={to} />
      ) : null}

      {activeStep === "basics" ? (
        <BasicsStep control={control} register={register} t={t} tc={tc} to={to} />
      ) : null}

      {activeStep === "accuracy" ? (
        <AccuracyStep
          control={control}
          register={register}
          sharpened={sharpened}
          hasMeasuredArea={Boolean(defaults?.areaSqft)}
          t={t}
          tc={tc}
          to={to}
        />
      ) : null}

      <div className="sticky bottom-4 z-10 flex flex-col gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur sm:static sm:flex-row sm:items-center sm:shadow-none">
        <div className="flex items-center justify-between gap-2 sm:flex-1">
          <button
            type="button"
            onClick={previousStep}
            disabled={stepIndex === 0}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-40"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("previousStep")}
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={stepIndex === STEP_KEYS.length - 1}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-brand disabled:opacity-40"
          >
            {t("nextStep")}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
        <p className="text-center text-[11px] text-muted sm:text-left">
          {sharpened > 0 ? t("confidenceUp", { count: sharpened }) : t("buildAnytime")}
        </p>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-on-strong shadow-sm transition hover:bg-brand-strong hover:shadow-md"
        >
          <Sparkles className="size-4" aria-hidden />
          {t("buildButton")}
        </button>
      </div>
    </form>
  );
}

function GoalStep({
  control,
  setValue,
  t,
  to,
}: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
  t: ReturnType<typeof useTranslations<"Intake">>;
  to: ReturnType<typeof useTranslations<"Options">>;
}) {
  return (
    <section className="card p-4 sm:p-5">
      <Controller
        control={control}
        name="scope"
        render={({ field }) => (
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">{t("scopeQuestion")}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {SCOPE_OPTIONS.map((scope) => (
                <ChoiceButton
                  key={scope.value}
                  active={field.value === scope.value}
                  onClick={() => field.onChange(scope.value)}
                  label={to(`scope.${scope.value}`)}
                />
              ))}
            </div>
          </fieldset>
        )}
      />

      <Controller
        control={control}
        name="goal"
        render={({ field }) => (
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-foreground">{t("goalQuestion")}</legend>
            <Controller
              control={control}
              name="problemType"
              render={({ field: problemField }) => (
                <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    <HelpCircle className="size-4 text-brand" aria-hidden />
                    {t("problemHint")}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PROBLEM_OPTIONS.map((problem) => (
                      <button
                        type="button"
                        key={problem.value}
                        onClick={() => {
                          const next = problemField.value === problem.value ? "" : problem.value;
                          problemField.onChange(next);
                          if (next) {
                            field.onChange(problem.goal);
                            setValue("goal", problem.goal);
                          }
                        }}
                        aria-pressed={problemField.value === problem.value}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          problemField.value === problem.value
                            ? "bg-brand text-on-strong"
                            : "border border-border text-foreground hover:border-brand"
                        }`}
                      >
                        {to(`problems.${problem.value}`)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {GOALS.map((goal, index) => (
                <button
                  type="button"
                  key={goal.value}
                  onClick={() => field.onChange(goal.value)}
                  aria-pressed={field.value === goal.value}
                  className={`relative overflow-hidden rounded-xl border p-3 text-left transition hover:border-brand hover:shadow-sm ${
                    field.value === goal.value
                      ? "border-brand bg-brand-soft"
                      : "border-border bg-surface"
                  }`}
                >
                  <div className="mb-3 h-14 rounded-lg bg-background/70">
                    <GoalIllustration index={index} />
                  </div>
                  {field.value === goal.value ? (
                    <Check className="absolute right-3 top-3 size-4 text-brand" aria-hidden />
                  ) : null}
                  <span className="block text-sm font-semibold text-foreground">
                    {to(`goals.${goal.value}`)}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {to(`goalBlurbs.${goal.value}`)}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
      />

      <TipDisclosure title={t("tips.goal.title")}>{t("tips.goal.body")}</TipDisclosure>
    </section>
  );
}

function BasicsStep({
  control,
  register,
  t,
  tc,
  to,
}: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  register: ReturnType<typeof useForm<FormValues>>["register"];
  t: ReturnType<typeof useTranslations<"Intake">>;
  tc: ReturnType<typeof useTranslations<"Common">>;
  to: ReturnType<typeof useTranslations<"Options">>;
}) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="size-4 text-brand" aria-hidden />
            {t("regionQuestion")}
          </span>
          <select {...register("regionId")} className="card w-full p-2.5 text-sm">
            {REGION_OPTIONS.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            {t("zipLabel")} <span className="font-normal text-muted">{t("zipHint")}</span>
          </span>
          <input
            type="text"
            {...register("locationQuery")}
            placeholder={t("zipPlaceholder")}
            autoComplete="postal-code"
            className="card w-full p-2.5 text-sm"
          />
        </label>
      </div>

      <Controller
        control={control}
        name="budgetIndex"
        render={({ field }) => (
          <fieldset className="mt-5">
            <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wallet className="size-4 text-brand" aria-hidden />
              {t("budgetQuestion")}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              {BUDGETS.map((budget, index) => (
                <ChoiceButton
                  key={budget.label}
                  active={field.value === index}
                  onClick={() => field.onChange(index)}
                  label={to(`budgets.${index}`)}
                />
              ))}
            </div>
          </fieldset>
        )}
      />

      <Controller
        control={control}
        name="effortLevel"
        render={({ field }) => (
          <fieldset className="mt-5">
            <legend className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Wrench className="size-4 text-brand" aria-hidden />
              {t("effortQuestion")}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {EFFORTS.map((effort) => (
                <ChoiceButton
                  key={effort.value}
                  active={field.value === effort.value}
                  onClick={() => field.onChange(effort.value)}
                  label={to(`efforts.${effort.value}`)}
                />
              ))}
            </div>
          </fieldset>
        )}
      />

      <TipDisclosure title={t("tips.budget.title")}>{t("tips.budget.body")}</TipDisclosure>
      <p className="mt-4 text-xs text-muted">
        {tc("notSure")}: {t("unknownsNote")}
      </p>
    </section>
  );
}

function AccuracyStep({
  control,
  register,
  sharpened,
  hasMeasuredArea,
  t,
  tc,
  to,
}: {
  control: ReturnType<typeof useForm<FormValues>>["control"];
  register: ReturnType<typeof useForm<FormValues>>["register"];
  sharpened: number;
  hasMeasuredArea: boolean;
  t: ReturnType<typeof useTranslations<"Intake">>;
  tc: ReturnType<typeof useTranslations<"Common">>;
  to: ReturnType<typeof useTranslations<"Options">>;
}) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="rounded-xl border border-brand/20 bg-brand-soft p-3 text-sm text-brand-strong">
        <p className="font-semibold">{t("sharpenTitle")}</p>
        <p className="mt-1 text-xs">
          {sharpened > 0 ? t("sharpenCount", { count: sharpened }) : t("sharpenSummary")}
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <SelectField
          label={t("areaQuestion")}
          hint={t("areaOptional")}
          field={register("areaType")}
        >
          <option value="">{tc("notSure")}</option>
          {AREAS.map((area) => (
            <option key={area.value} value={area.value}>
              {to(`areas.${area.value}`)}
            </option>
          ))}
        </SelectField>

        <label className="block">
          <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Ruler className="size-4 text-brand" aria-hidden />
            {t("areaSqftLabel")} <span className="font-normal text-muted">{t("areaOptional")}</span>
          </span>
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            {...register("areaSqft")}
            placeholder={t("areaSqftPlaceholder")}
            className="card w-full p-2.5 text-sm"
          />
          {hasMeasuredArea ? (
            <span className="mt-1 block text-xs text-brand-strong">{t("areaSqftMeasured")}</span>
          ) : null}
        </label>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            {t("dimsLabel")} <span className="font-normal text-muted">{t("areaOptional")}</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              {...register("lengthVal")}
              placeholder={t("dimsLength")}
              aria-label={t("dimsLength")}
              className="card w-24 p-2.5 text-sm"
            />
            <span className="text-muted">x</span>
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              {...register("widthVal")}
              placeholder={t("dimsWidth")}
              aria-label={t("dimsWidth")}
              className="card w-24 p-2.5 text-sm"
            />
            <select
              {...register("dimUnit")}
              aria-label={t("dimsUnit")}
              className="card p-2.5 text-sm"
            >
              <option value="ft">{t("dimsFeet")}</option>
              <option value="m">{t("dimsMetres")}</option>
            </select>
          </div>
          <span className="mt-1 block text-xs text-muted">{t("dimsHint")}</span>
        </div>

        <SelectField
          label={t("sunQuestion")}
          field={register("sun")}
          icon={<Sun className="size-4 text-brand" aria-hidden />}
        >
          {SUN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {to(`sun.${option.value}`)}
            </option>
          ))}
        </SelectField>

        <SelectField label={t("soilQuestion")} field={register("soil")}>
          {SOIL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {to(`soil.${option.value}`)}
            </option>
          ))}
        </SelectField>

        <SelectField label={t("drainageQuestion")} field={register("drainage")}>
          {DRAINAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {to(`drainage.${option.value}`)}
            </option>
          ))}
        </SelectField>

        <SelectField
          label={t("styleQuestion")}
          hint={t("areaOptional")}
          field={register("stylePreference")}
        >
          <option value="">{t("styleNoPref")}</option>
          {STYLE_OPTIONS.map((style) => (
            <option key={style.value} value={style.value}>
              {to(`styles.${style.value}`)}
            </option>
          ))}
        </SelectField>
      </div>

      <Controller
        control={control}
        name="helpers"
        render={({ field }) => (
          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-foreground">
              {t("helpersQuestion")}
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {HELPER_OPTIONS.map((helper) => (
                <ChoiceButton
                  key={helper.value}
                  active={field.value === String(helper.value)}
                  onClick={() => field.onChange(String(helper.value))}
                  label={t(`helpers.${helper.value}`)}
                />
              ))}
            </div>
          </fieldset>
        )}
      />

      <Controller
        control={control}
        name="hasPetsOrKids"
        render={({ field }) => (
          <button
            type="button"
            onClick={() => field.onChange(!field.value)}
            aria-pressed={Boolean(field.value)}
            className={`mt-4 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
              field.value ? "border-brand bg-brand-soft" : "border-border hover:border-brand"
            }`}
          >
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition ${
                field.value ? "border-brand bg-brand text-on-strong" : "border-border"
              }`}
            >
              {field.value ? <Check className="size-3.5" aria-hidden /> : null}
            </span>
            <span>
              <span className="block text-sm font-semibold text-foreground">
                {t("petsQuestion")}
              </span>
              <span className="block text-xs text-muted">{t("petsHint")}</span>
            </span>
          </button>
        )}
      />

      <TipDisclosure title={t("tips.accuracy.title")}>{t("tips.accuracy.body")}</TipDisclosure>
    </section>
  );
}

function PhotoContextCard({
  photoAnalysis,
  photoPreviewUrl,
  photoCount,
  hints,
  onApply,
  t,
}: {
  photoAnalysis?: PhotoAnalysisResult | null;
  photoPreviewUrl?: string | null;
  photoCount: number;
  hints: PhotoHints;
  onApply: () => void;
  t: ReturnType<typeof useTranslations<"Intake">>;
}) {
  const hasHints =
    hints.items.length > 0 ||
    Boolean(hints.suggestedArea || hints.suggestedGoal || hints.suggestedSun);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex gap-3">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-brand-soft">
          {photoPreviewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreviewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="size-6 text-brand" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Camera className="size-4 text-brand" aria-hidden />
            <p className="text-sm font-semibold text-foreground">{t("photoContextTitle")}</p>
          </div>
          <p className="mt-1 text-xs text-muted">
            {photoCount > 0
              ? t("photoContextCount", { count: photoCount })
              : t("photoContextEmpty")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hasHints ? (
              hints.items.slice(0, 4).map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-brand/20 bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand-strong"
                >
                  {item}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-border px-2 py-1 text-[11px] text-muted">
                {t("photoContextNoMl")}
              </span>
            )}
          </div>
        </div>
      </div>
      {photoAnalysis ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">
            {t("photoContextConfidence", {
              confidence: Math.round(photoAnalysis.confidence * 100),
            })}
          </span>
          <button
            type="button"
            onClick={onApply}
            disabled={!hasHints}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-brand disabled:opacity-40"
          >
            {t("applyPhotoHints")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function PlanStepper({
  active,
  setActive,
  t,
}: {
  active: number;
  setActive: (index: number) => void;
  t: ReturnType<typeof useTranslations<"Intake">>;
}) {
  return (
    <div className="grid grid-cols-3 gap-1 border-t border-border bg-background/50 p-2">
      {STEP_KEYS.map((key, index) => (
        <button
          key={key}
          type="button"
          onClick={() => setActive(index)}
          aria-current={active === index ? "step" : undefined}
          className={`rounded-xl px-2 py-2 text-left text-xs transition ${
            active === index
              ? "bg-brand text-on-strong shadow-sm"
              : index < active
                ? "bg-brand-soft text-brand-strong"
                : "text-muted hover:bg-surface"
          }`}
        >
          <span className="block font-semibold">
            {index + 1}. {t(`steps.${key}.short`)}
          </span>
          <span className="mt-0.5 block opacity-80">
            {index < active ? t("stepDone") : active === index ? t("stepActive") : t("stepNext")}
          </span>
        </button>
      ))}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition hover:border-brand ${
        active
          ? "border-brand bg-brand text-on-strong shadow-sm"
          : "border-border bg-surface text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function TipDisclosure({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mt-4 rounded-xl border border-border bg-background/60 p-3 text-sm">
      <summary className="cursor-pointer select-none font-semibold text-foreground">
        {title}
      </summary>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </details>
  );
}

function SelectField({
  label,
  hint,
  field,
  children,
  icon,
}: {
  label: string;
  hint?: string;
  field: UseFormRegisterReturn;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {label} {hint ? <span className="font-normal text-muted">{hint}</span> : null}
      </span>
      <select {...field} className="card w-full p-2.5 text-sm">
        {children}
      </select>
    </label>
  );
}

function StepVisual({ step, photoPreviewUrl }: { step: StepKey; photoPreviewUrl?: string | null }) {
  return (
    <div className="relative min-h-28 overflow-hidden rounded-2xl border border-border bg-brand-soft">
      {photoPreviewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoPreviewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-surface/55" />
      <div className="absolute inset-4 rounded-xl border border-brand/30 bg-surface/55" />
      {step === "goal" ? (
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
          <div className="h-12 w-7 rounded-full bg-brand/35" />
          <div className="h-16 w-8 rounded-full bg-brand/45" />
          <div className="h-10 w-6 rounded-full bg-brand/30" />
        </div>
      ) : step === "basics" ? (
        <div className="absolute inset-x-5 bottom-5 flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-brand/45" />
          <Wallet className="size-7 text-brand" aria-hidden />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid size-20 grid-cols-2 gap-2">
            <Sun className="size-8 text-brand" aria-hidden />
            <Ruler className="size-8 text-brand" aria-hidden />
            <CheckCircle2 className="size-8 text-brand" aria-hidden />
            <AlertTriangle className="size-8 text-[var(--warn)]" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}

function GoalIllustration({ index }: { index: number }) {
  return (
    <div className="relative h-full overflow-hidden rounded-lg">
      <div className="absolute inset-x-3 bottom-2 h-3 rounded-full bg-brand/15" />
      <div className="absolute bottom-3 left-4 h-8 w-4 rounded-full bg-brand/35" />
      <div className="absolute bottom-3 left-1/2 h-10 w-5 -translate-x-1/2 rounded-full bg-brand/40" />
      <div className="absolute bottom-3 right-5 h-7 w-4 rounded-full bg-brand/25" />
      <div
        className="absolute top-3 rounded-full border border-brand/40"
        style={{
          left: `${12 + index * 5}%`,
          width: `${28 + index * 3}px`,
          height: `${18 + index * 2}px`,
        }}
      />
    </div>
  );
}

type PhotoHints = {
  items: string[];
  suggestedArea?: string;
  suggestedGoal?: ProjectGoal;
  suggestedSun?: SunExposure;
};

function buildPhotoHints(analysis?: PhotoAnalysisResult | null): PhotoHints {
  if (!analysis) return { items: [] };
  const items = [
    ...analysis.zones.map((zone) => zone.label),
    ...analysis.detectedObjects
      .filter((item) => !item.toLowerCase().includes("warning"))
      .slice(0, 3),
  ];
  const zoneTypes = new Set(analysis.zones.map((zone) => zone.type));
  const sunAssumption = analysis.assumptions.find((item) => item.id === "sun")?.value.toLowerCase();
  const suggestedSun: SunExposure | undefined = sunAssumption?.includes("lots of sun")
    ? "full-sun"
    : sunAssumption?.includes("some sun")
      ? "part-sun"
      : sunAssumption?.includes("mostly shade")
        ? "shade"
        : undefined;
  return {
    items: Array.from(new Set(items)),
    suggestedArea:
      zoneTypes.has("foundation") || zoneTypes.has("planting_bed") ? "foundation-bed" : undefined,
    suggestedGoal: zoneTypes.has("privacy_gap") ? "privacy" : undefined,
    suggestedSun,
  };
}
