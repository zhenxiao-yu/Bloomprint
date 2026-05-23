"use client";

import { useTranslations } from "next-intl";
import type { SourceRef } from "@/domain/models";

type BadgeKind = "official" | "retailer" | "dataset" | "estimate" | "verify";

/** Map a Source Quality Ladder entry to an honest, human badge. */
function kindFor(source: SourceRef): BadgeKind {
  switch (source.sourceType) {
    case "official":
      return "official";
    case "retailer-cost":
      return "estimate";
    case "extension-botanical":
      return "dataset";
    default:
      return source.needsLocalVerification ? "verify" : "estimate";
  }
}

// Token-based tones (no arbitrary values) so badges track the theme in light + dark.
const TONE: Record<BadgeKind, string> = {
  official: "bg-trust/10 text-trust",
  retailer: "bg-blueprint-soft text-blueprint",
  dataset: "bg-brand-soft text-brand-strong",
  estimate: "bg-surface-muted text-muted",
  verify: "bg-warn/10 text-warn",
};

const LABEL_KEY: Record<BadgeKind, "badgeOfficial" | "badgeRetailer" | "badgeDataset" | "badgeEstimate" | "badgeVerify"> = {
  official: "badgeOfficial",
  retailer: "badgeRetailer",
  dataset: "badgeDataset",
  estimate: "badgeEstimate",
  verify: "badgeVerify",
};

export function LiveBadge({ source }: { source: SourceRef }) {
  const t = useTranslations("Live");
  const kind = kindFor(source);
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.68rem] font-medium ${TONE[kind]}`}
      title={source.sourceName ?? source.name}
    >
      {t(LABEL_KEY[kind])}
    </span>
  );
}
