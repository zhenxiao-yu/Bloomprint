import type { FailurePoint } from "@/domain/models";
import { Section } from "@/components/ui";

/** "If this doesn't go to plan…" — honest failure modes + how to de-risk each. */
export function FailurePointsCard({ points }: { points: FailurePoint[] }) {
  if (points.length === 0) return null;
  return (
    <Section title="If something doesn't go to plan" subtitle="The common ways yard projects slip — and how to avoid each.">
      <ul className="space-y-3">
        {points.map((p, i) => (
          <li key={i} className="text-sm">
            <p className="font-medium text-foreground">⚠ {p.risk}</p>
            <p className="mt-0.5 text-muted">→ {p.fix}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
