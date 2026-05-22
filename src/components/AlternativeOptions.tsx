import type { AlternativeKind, PlantAlternatives } from "@/domain/models";

const KIND_LABEL: Record<AlternativeKind, string> = {
  substitute: "If unavailable",
  cheaper: "Cheaper",
  "lower-maintenance": "Lower upkeep",
  "pet-safer": "Pet-safer",
  premium: "Premium",
  avoid: "Avoid",
};

/** Per-plant fallbacks so the user is never stuck at the store. */
export function AlternativeOptions({ alt }: { alt: PlantAlternatives }) {
  return (
    <details className="group mt-2">
      <summary className="cursor-pointer list-none text-xs font-medium text-brand">
        Alternatives <span className="text-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <ul className="mt-1 space-y-1 text-xs">
        {alt.options.map((o, i) => (
          <li key={`${o.kind}-${i}`} className="flex gap-2">
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${
                o.kind === "avoid" ? "bg-[var(--warn)]/10 text-[var(--warn)]" : "bg-brand-soft text-brand-strong"
              }`}
            >
              {KIND_LABEL[o.kind]}
            </span>
            <span className="text-foreground">
              {o.label}
              {o.note ? <span className="text-muted"> — {o.note}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
