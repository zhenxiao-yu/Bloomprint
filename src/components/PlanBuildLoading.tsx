"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const STEPS = [
  "Reading intake and saved preferences",
  "Scoring plants against region, sun, pets, and effort",
  "Sizing materials and labor ranges",
  "Checking risks, substitutions, and store-ready notes",
  "Packaging the plan for review",
];

export function PlanBuildLoading({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((current) => Math.min(current + 1, STEPS.length - 1));
    }, 850);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={`card overflow-hidden ${compact ? "p-4" : "p-5 sm:p-6"}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-brand-soft p-2 text-brand">
          <Loader2 className="size-5 animate-spin" aria-hidden />
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">
            Building a deterministic yard plan
          </p>
          <p className="mt-1 text-sm text-muted">
            Bloomprint is using the core planner first. AI, if enabled, can only polish wording
            after facts are set.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {STEPS.map((step, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                current
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : done
                    ? "border-border bg-surface text-foreground"
                    : "border-border bg-background/60 text-muted"
              }`}
            >
              {done ? (
                <CheckCircle2 className="size-4 text-brand" aria-hidden />
              ) : current ? (
                <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
              ) : (
                <span className="size-4 rounded-full border border-border" aria-hidden />
              )}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
