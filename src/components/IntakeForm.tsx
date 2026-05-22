"use client";

import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ProjectGoal, EffortLevel } from "@/domain/models";
import { AREAS, BUDGETS, EFFORTS, GOALS, REGION_OPTIONS } from "@/lib/uiOptions";

export interface IntakeValues {
  regionId: string;
  locationQuery?: string;
  goal: ProjectGoal;
  budget: number;
  budgetStyle: "budget" | "balanced" | "premium";
  effortLevel: EffortLevel;
  areaType?: string;
  hasPhoto: boolean;
}

export interface IntakeDefaults {
  regionId?: string;
  goal?: ProjectGoal;
  budgetIndex?: number;
  effortLevel?: EffortLevel;
}

// Internal form shape (budget held as an index into BUDGETS until submit).
// Nothing here blocks: every field has a sensible default so unknowns never
// stop a plan — they just lower confidence later.
const formSchema = z.object({
  regionId: z.string().min(1),
  locationQuery: z.string().optional(),
  goal: z.string(),
  budgetIndex: z.number().int().min(0),
  effortLevel: z.string(),
  areaType: z.string().optional(),
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

  const { register, handleSubmit, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      regionId: defaults?.regionId ?? REGION_OPTIONS[0].value,
      locationQuery: "",
      goal: defaults?.goal ?? "general",
      budgetIndex: defaults?.budgetIndex ?? 1,
      effortLevel: defaults?.effortLevel ?? "moderate",
      areaType: "",
    },
  });

  function submit(values: FormValues) {
    const b = BUDGETS[values.budgetIndex];
    onSubmit({
      regionId: values.regionId,
      locationQuery: values.locationQuery?.trim() || undefined,
      goal: values.goal as ProjectGoal,
      budget: b.budget,
      budgetStyle: b.budgetStyle,
      effortLevel: values.effortLevel as EffortLevel,
      areaType: values.areaType || undefined,
      hasPhoto: false,
    });
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-7">
      <Controller
        control={control}
        name="goal"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-foreground">{t("goalQuestion")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {GOALS.map((g) => (
                <button
                  type="button"
                  key={g.value}
                  onClick={() => field.onChange(g.value)}
                  aria-pressed={field.value === g.value}
                  className={`card p-3 text-left transition ${
                    field.value === g.value ? "ring-2 ring-brand" : "hover:border-brand"
                  }`}
                >
                  <span className="block text-sm font-medium text-foreground">{g.label}</span>
                  <span className="block text-xs text-muted">{g.blurb}</span>
                </button>
              ))}
            </div>
          </fieldset>
        )}
      />

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

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            {t("areaQuestion")} <span className="font-normal text-muted">{t("areaOptional")}</span>
          </span>
          <select {...register("areaType")} className="card w-full p-2.5 text-sm">
            <option value="">{tc("notSure")}</option>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    field.value === i ? "bg-brand text-on-strong" : "card text-foreground hover:border-brand"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      />

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
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    field.value === ef.value ? "bg-brand text-on-strong" : "card text-foreground hover:border-brand"
                  }`}
                >
                  {ef.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      />

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-muted">{t("noPhotoNote")}</p>
        <button
          type="submit"
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
        >
          {t("buildButton")}
        </button>
      </div>
    </form>
  );
}
