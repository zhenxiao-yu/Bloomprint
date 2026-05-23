"use client";

import { useTranslations } from "next-intl";
import { useForm, Controller, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Sparkles } from "lucide-react";
import type {
  Drainage,
  EffortLevel,
  ProjectGoal,
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
  REGION_OPTIONS,
  SOIL_OPTIONS,
  STYLE_OPTIONS,
  SUN_OPTIONS,
} from "@/lib/uiOptions";
import { Reveal } from "@/components/ui/reveal";
import { Disclosure } from "@/components/ui/disclosure";

export interface IntakeValues {
  regionId: string;
  locationQuery?: string;
  goal: ProjectGoal;
  budget: number;
  budgetStyle: "budget" | "balanced" | "premium";
  effortLevel: EffortLevel;
  areaType?: string;
  /** Measured/known planting-bed area in sq ft — sharpens material + plant counts. */
  areaSqft?: number;
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

// Internal form shape. Nothing here blocks: every field has a sensible default
// so unknowns never stop a plan — they only lower confidence later.
const formSchema = z.object({
  regionId: z.string().min(1),
  locationQuery: z.string().optional(),
  goal: z.string(),
  budgetIndex: z.number().int().min(0),
  effortLevel: z.string(),
  areaType: z.string().optional(),
  areaSqft: z.string().optional(),
  sun: z.string().optional(),
  soil: z.string().optional(),
  drainage: z.string().optional(),
  hasPetsOrKids: z.boolean().optional(),
  helpers: z.string().optional(),
  stylePreference: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function IntakeForm({
  defaults,
  onSubmit,
}: {
  defaults?: IntakeDefaults;
  onSubmit: (values: IntakeValues) => void;
}) {
  const t = useTranslations("Intake");
  const tc = useTranslations("Common");
  const to = useTranslations("Options");

  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regionId: defaults?.regionId ?? REGION_OPTIONS[0].value,
      locationQuery: "",
      goal: defaults?.goal ?? "general",
      budgetIndex: defaults?.budgetIndex ?? 1,
      effortLevel: defaults?.effortLevel ?? "moderate",
      areaType: "",
      areaSqft: defaults?.areaSqft ? String(Math.round(defaults.areaSqft)) : "",
      sun: "unknown",
      soil: "unknown",
      drainage: "unknown",
      hasPetsOrKids: false,
      helpers: "",
      stylePreference: "",
    },
  });

  // Live "how sharp will this be?" nudge — counts the optional details answered.
  const w = useWatch({ control });
  const sharpened =
    (w.areaType ? 1 : 0) +
    (w.areaSqft ? 1 : 0) +
    (w.sun && w.sun !== "unknown" ? 1 : 0) +
    (w.soil && w.soil !== "unknown" ? 1 : 0) +
    (w.drainage && w.drainage !== "unknown" ? 1 : 0) +
    (w.hasPetsOrKids ? 1 : 0) +
    (w.helpers ? 1 : 0) +
    (w.stylePreference ? 1 : 0);

  function submit(values: FormValues) {
    const b = BUDGETS[values.budgetIndex];
    const area = values.areaSqft ? Number(values.areaSqft) : NaN;
    const helpers = values.helpers ? Number(values.helpers) : NaN;
    onSubmit({
      regionId: values.regionId,
      locationQuery: values.locationQuery?.trim() || undefined,
      goal: values.goal as ProjectGoal,
      budget: b.budget,
      budgetStyle: b.budgetStyle,
      effortLevel: values.effortLevel as EffortLevel,
      areaType: values.areaType || undefined,
      areaSqft: Number.isFinite(area) && area > 0 ? area : undefined,
      sun: (values.sun as SunExposure) || undefined,
      soil: (values.soil as SoilType) || undefined,
      drainage: (values.drainage as Drainage) || undefined,
      hasPetsOrKids: values.hasPetsOrKids || undefined,
      helpers: Number.isFinite(helpers) ? helpers : undefined,
      stylePreference: (values.stylePreference as StyleFamily) || undefined,
      hasPhoto: false,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-7">
      <Reveal>
        <Controller
          control={control}
          name="goal"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-foreground">{t("goalQuestion")}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {GOALS.map((g) => {
                  const active = field.value === g.value;
                  return (
                    <button
                      type="button"
                      key={g.value}
                      onClick={() => field.onChange(g.value)}
                      aria-pressed={active}
                      className={`card relative p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:border-brand hover:shadow-md active:translate-y-0 ${
                        active ? "ring-2 ring-brand" : ""
                      }`}
                    >
                      {active ? (
                        <Check className="absolute right-3 top-3 size-4 text-brand" aria-hidden />
                      ) : null}
                      <span className="block text-sm font-medium text-foreground">{to(`goals.${g.value}`)}</span>
                      <span className="block text-xs text-muted">{to(`goalBlurbs.${g.value}`)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}
        />
      </Reveal>

      <Reveal delay={60}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-foreground">{t("regionQuestion")}</span>
            <select {...register("regionId")} className="card w-full p-2.5 text-sm">
              {REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
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
      </Reveal>

      <Reveal delay={120}>
        <Controller
          control={control}
          name="budgetIndex"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-foreground">{t("budgetQuestion")}</legend>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b, i) => (
                  <button
                    type="button"
                    key={b.label}
                    onClick={() => field.onChange(i)}
                    aria-pressed={field.value === i}
                    className={`rounded-full px-4 py-2 text-sm transition duration-150 active:scale-[0.97] ${
                      field.value === i ? "bg-brand text-on-strong shadow-sm" : "card text-foreground hover:border-brand"
                    }`}
                  >
                    {to(`budgets.${i}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        />
      </Reveal>

      <Reveal delay={180}>
        <Controller
          control={control}
          name="effortLevel"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-foreground">{t("effortQuestion")}</legend>
              <div className="flex flex-wrap gap-2">
                {EFFORTS.map((ef) => (
                  <button
                    type="button"
                    key={ef.value}
                    onClick={() => field.onChange(ef.value)}
                    aria-pressed={field.value === ef.value}
                    className={`rounded-full px-4 py-2 text-sm transition duration-150 active:scale-[0.97] ${
                      field.value === ef.value ? "bg-brand text-on-strong shadow-sm" : "card text-foreground hover:border-brand"
                    }`}
                  >
                    {to(`efforts.${ef.value}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        />
      </Reveal>

      {/* Optional accuracy fields — every one genuinely sharpens the plan, none block it. */}
      <Reveal delay={220}>
        <Disclosure
          title={t("sharpenTitle")}
          summary={sharpened > 0 ? t("sharpenCount", { count: sharpened }) : t("sharpenSummary")}
          badge={
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-strong">
              {t("optionalBadge")}
            </span>
          }
          defaultOpen={!!defaults?.areaSqft}
        >
          <div className="space-y-5">
            <p className="text-xs text-muted">{t("sharpenHint")}</p>

            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField label={t("areaQuestion")} hint={t("areaOptional")} field={register("areaType")}>
                <option value="">{tc("notSure")}</option>
                {AREAS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {to(`areas.${a.value}`)}
                  </option>
                ))}
              </SelectField>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-foreground">
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
                {defaults?.areaSqft ? (
                  <span className="mt-1 block text-xs text-brand-strong">{t("areaSqftMeasured")}</span>
                ) : null}
              </label>

              <SelectField label={t("sunQuestion")} field={register("sun")}>
                {SUN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {to(`sun.${o.value}`)}
                  </option>
                ))}
              </SelectField>

              <SelectField label={t("soilQuestion")} field={register("soil")}>
                {SOIL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {to(`soil.${o.value}`)}
                  </option>
                ))}
              </SelectField>

              <SelectField label={t("drainageQuestion")} field={register("drainage")}>
                {DRAINAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {to(`drainage.${o.value}`)}
                  </option>
                ))}
              </SelectField>

              <SelectField label={t("styleQuestion")} hint={t("areaOptional")} field={register("stylePreference")}>
                <option value="">{t("styleNoPref")}</option>
                {STYLE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {to(`styles.${s.value}`)}
                  </option>
                ))}
              </SelectField>
            </div>

            <Controller
              control={control}
              name="helpers"
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-foreground">{t("helpersQuestion")}</legend>
                  <div className="flex flex-wrap gap-2">
                    {HELPER_OPTIONS.map((h) => (
                      <button
                        type="button"
                        key={h.value}
                        onClick={() => field.onChange(String(h.value))}
                        aria-pressed={field.value === String(h.value)}
                        className={`rounded-full px-4 py-2 text-sm transition duration-150 active:scale-[0.97] ${
                          field.value === String(h.value) ? "bg-brand text-on-strong shadow-sm" : "card text-foreground hover:border-brand"
                        }`}
                      >
                        {t(`helpers.${h.value}`)}
                      </button>
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
                  aria-pressed={!!field.value}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
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
                    <span className="block text-sm font-medium text-foreground">{t("petsQuestion")}</span>
                    <span className="block text-xs text-muted">{t("petsHint")}</span>
                  </span>
                </button>
              )}
            />
          </div>
        </Disclosure>
      </Reveal>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface/90 p-3 shadow-lg backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
        <p className="hidden text-xs text-muted sm:block">
          {sharpened > 0 ? t("confidenceUp", { count: sharpened }) : t("noPhotoNote")}
        </p>
        <button
          type="submit"
          className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-on-strong shadow-sm transition duration-150 hover:bg-brand-strong hover:shadow-md active:scale-[0.98]"
        >
          <Sparkles className="size-4" aria-hidden />
          {t("buildButton")}
        </button>
      </div>
    </form>
  );
}

/**
 * A labeled <select>. `field` is react-hook-form's register() result, spread
 * directly onto the native <select> so the ref/handlers attach correctly.
 */
function SelectField({
  label,
  hint,
  field,
  children,
}: {
  label: string;
  hint?: string;
  field: UseFormRegisterReturn;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-foreground">
        {label} {hint ? <span className="font-normal text-muted">{hint}</span> : null}
      </span>
      <select {...field} className="card w-full p-2.5 text-sm">
        {children}
      </select>
    </label>
  );
}
