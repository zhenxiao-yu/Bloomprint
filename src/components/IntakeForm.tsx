"use client";

import { useState } from "react";
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

export function IntakeForm({
  defaults,
  onSubmit,
}: {
  defaults?: IntakeDefaults;
  onSubmit: (values: IntakeValues) => void;
}) {
  const [regionId, setRegionId] = useState(defaults?.regionId ?? REGION_OPTIONS[0].value);
  const [goal, setGoal] = useState<ProjectGoal>(defaults?.goal ?? "general");
  const [budgetIndex, setBudgetIndex] = useState(defaults?.budgetIndex ?? 1);
  const [effortLevel, setEffortLevel] = useState<EffortLevel>(defaults?.effortLevel ?? "moderate");
  const [areaType, setAreaType] = useState<string>("");
  const [locationQuery, setLocationQuery] = useState<string>("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const b = BUDGETS[budgetIndex];
    onSubmit({
      regionId,
      locationQuery: locationQuery.trim() || undefined,
      goal,
      budget: b.budget,
      budgetStyle: b.budgetStyle,
      effortLevel,
      areaType: areaType || undefined,
      hasPhoto: false,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-foreground">
          What do you want to do?
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => (
            <button
              type="button"
              key={g.value}
              onClick={() => setGoal(g.value)}
              aria-pressed={goal === g.value}
              className={`card p-3 text-left transition ${
                goal === g.value ? "ring-2 ring-brand" : "hover:border-brand"
              }`}
            >
              <span className="block text-sm font-medium text-foreground">{g.label}</span>
              <span className="block text-xs text-muted">{g.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">Where is the yard?</span>
          <select
            value={regionId}
            onChange={(e) => setRegionId(e.target.value)}
            className="card w-full p-2.5 text-sm"
          >
            {REGION_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            ZIP / postal code <span className="font-normal text-muted">(optional, sharpens the zone)</span>
          </span>
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            placeholder="e.g. 60601 or M5V"
            autoComplete="postal-code"
            className="card w-full p-2.5 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            Where in the yard? <span className="font-normal text-muted">(optional)</span>
          </span>
          <select
            value={areaType}
            onChange={(e) => setAreaType(e.target.value)}
            className="card w-full p-2.5 text-sm"
          >
            <option value="">Not sure yet</option>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-foreground">Rough budget?</legend>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b, i) => (
            <button
              type="button"
              key={b.label}
              onClick={() => setBudgetIndex(i)}
              aria-pressed={budgetIndex === i}
              className={`rounded-full px-4 py-2 text-sm transition ${
                budgetIndex === i
                  ? "bg-brand text-white"
                  : "card text-foreground hover:border-brand"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-foreground">
          How much work do you want to do?
        </legend>
        <div className="flex flex-wrap gap-2">
          {EFFORTS.map((ef) => (
            <button
              type="button"
              key={ef.value}
              onClick={() => setEffortLevel(ef.value)}
              aria-pressed={effortLevel === ef.value}
              className={`rounded-full px-4 py-2 text-sm transition ${
                effortLevel === ef.value
                  ? "bg-brand text-white"
                  : "card text-foreground hover:border-brand"
              }`}
            >
              {ef.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="text-xs text-muted">
          No photo needed — you&apos;ll get a layout you can build. Add details after to sharpen it.
        </p>
        <button
          type="submit"
          className="rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
        >
          Build my plan
        </button>
      </div>
    </form>
  );
}
