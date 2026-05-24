"use client";

import { useTranslations } from "next-intl";
import type { FailurePoint } from "@/domain/models";
import { Section } from "@/components/ui";

/** "If this doesn't go to plan…" — honest failure modes + how to de-risk each. */
export function FailurePointsCard({ points }: { points: FailurePoint[] }) {
  const t = useTranslations("Result");
  if (points.length === 0) return null;
  return (
    <Section title={t("failureTitle")} subtitle={t("failureSubtitle")}>
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
