import { useTranslations } from "next-intl";
import type { Readiness } from "@/domain/models";

/** Gamified completeness meter — answering accuracy questions fills the bar. */
export function ReadinessMeter({ readiness }: { readiness: Readiness }) {
  const t = useTranslations("Result");
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t("readinessTitle")}</h3>
        <span className="text-sm font-semibold text-brand-strong">
          {readiness.label} · {readiness.score}%
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${readiness.score}%` }}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {readiness.factors.map((f) => (
          <span
            key={f.label}
            className={`rounded-full px-2.5 py-1 text-xs ${
              f.done ? "bg-brand-soft text-brand-strong" : "border border-dashed border-border text-muted"
            }`}
          >
            {f.done ? "✓" : "○"} {f.label}
          </span>
        ))}
      </div>
      {readiness.score < 100 ? (
        <p className="mt-2 text-xs text-muted">{t("readinessHint")}</p>
      ) : null}
    </div>
  );
}
