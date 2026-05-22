import type { PlanEvidence } from "@/domain/models";
import { SOURCE_LEVELS } from "@/domain/evidence/sourceQuality";
import type { ViewMode } from "@/components/PlanResult";

/** "Why should I trust this?" — inputs, assumptions, confidence by dimension, and ranked sources. */
export function EvidenceDrawer({ evidence, view }: { evidence: PlanEvidence; view: ViewMode }) {
  const expert = view !== "simple";
  return (
    <details className="card group p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="text-base font-semibold text-foreground">Why Bloomprint recommends this</span>
        <span className="text-sm text-muted transition group-open:rotate-180">⌄</span>
      </summary>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Based on</p>
          <ul className="mt-1 space-y-0.5 text-sm text-foreground">
            {evidence.inputs.map((i) => (
              <li key={i}>✓ {i}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Confidence</p>
          <ul className="mt-1 space-y-0.5 text-sm text-foreground">
            {evidence.confidenceByDimension.map((c) => (
              <li key={c.dimension} className="flex justify-between gap-2">
                <span className="text-muted">{c.dimension}</span>
                <span className="font-medium">{c.level}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {evidence.assumptions.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What we assumed</p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted">
            {evidence.assumptions.map((a) => (
              <li key={a}>⚠ {a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sources</p>
        <ul className="mt-1 space-y-1 text-sm">
          {evidence.sources.map((s) => {
            const lvl = SOURCE_LEVELS.find((l) => l.level === s.level);
            return (
              <li key={s.name} className="flex flex-wrap items-center gap-2">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                    {s.name}
                  </a>
                ) : (
                  <span className="font-medium text-foreground">{s.name}</span>
                )}
                {expert ? (
                  <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted">
                    L{s.level} · {lvl?.name}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Hardiness references set the climate basis; the Core Library and your inputs do the rest. AI
          only rephrases — it never decides what to plant.
        </p>
      </div>
    </details>
  );
}
