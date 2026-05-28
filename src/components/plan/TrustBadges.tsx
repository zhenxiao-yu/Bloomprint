"use client";

import { useTranslations } from "next-intl";
import {
  BadgeCheck,
  Gauge,
  Lightbulb,
  type LucideIcon,
  MapPin,
  Ruler,
} from "lucide-react";
import type { ReactNode } from "react";

import type { ConfidenceLevel } from "@/domain/models";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Reusable trust primitives — the honest-AI contract made visible (docs/SPEC.md UX, Phase 11).
 *
 * These NEVER alter a value; they label HOW MUCH to trust it. Three concerns:
 *  - ConfidenceBadge:    our honest read on fit (low → high), stated calmly, never scary.
 *  - AssumptionBadge:    flags something we assumed because it wasn't specified.
 *  - VerificationBadge:  whether a fact is verified, an estimate, or needs a local check.
 *
 * All carry a tooltip explainer and stay on-brand. Tone is calm and practical, not legalistic.
 */

/** A small badge + an accessible tooltip explainer. */
function TrustChip({
  icon: Icon,
  label,
  tip,
  className,
}: {
  icon: LucideIcon;
  label: ReactNode;
  tip: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn("cursor-help gap-1 font-medium", className)}
          // The tooltip carries the full explanation; expose it to AT here too.
          aria-label={typeof label === "string" ? `${label} — ${tip}` : tip}
        >
          <Icon className="size-3" aria-hidden />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-[16rem] leading-relaxed">{tip}</TooltipContent>
    </Tooltip>
  );
}

const CONFIDENCE_STYLE: Record<ConfidenceLevel, string> = {
  high: "border-trust/30 bg-trust/10 text-trust",
  good: "border-trust/30 bg-trust/10 text-trust",
  medium: "border-warn/30 bg-warn/10 text-warn",
  low: "border-border bg-surface-muted/60 text-muted-foreground",
};

/** Honest confidence read. Lower = more local checks, never a worse plan. */
export function ConfidenceBadge({ level, className }: { level: ConfidenceLevel; className?: string }) {
  const t = useTranslations("Trust");
  return (
    <TrustChip
      icon={Gauge}
      label={`${t("confidence")}: ${t(`confidence_${level}`)}`}
      tip={t("confidenceTip")}
      className={cn(CONFIDENCE_STYLE[level], className)}
    />
  );
}

/** Flags something the plan assumed because the user didn't specify it. */
export function AssumptionBadge({ label, className }: { label?: string; className?: string }) {
  const t = useTranslations("Trust");
  return (
    <TrustChip
      icon={Lightbulb}
      label={label ?? t("assumption")}
      tip={t("assumptionTip")}
      className={cn("border-blueprint/30 bg-blueprint-soft text-blueprint", className)}
    />
  );
}

export type VerificationStatus = "verified" | "needs-verification" | "estimate";

const VERIFICATION: Record<VerificationStatus, { icon: LucideIcon; key: string; tip: string; style: string }> = {
  verified: { icon: BadgeCheck, key: "verifiedLabel", tip: "verifiedTip", style: "border-trust/30 bg-trust/10 text-trust" },
  "needs-verification": { icon: MapPin, key: "verifyLabel", tip: "verifyTip", style: "border-warn/30 bg-warn/10 text-warn" },
  estimate: { icon: Ruler, key: "estimateLabel", tip: "estimateTip", style: "border-border bg-surface-muted/60 text-muted-foreground" },
};

/** Whether a fact is verified, an estimate, or needs a local check. */
export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const t = useTranslations("Trust");
  const v = VERIFICATION[status];
  return <TrustChip icon={v.icon} label={t(v.key)} tip={t(v.tip)} className={cn(v.style, className)} />;
}

/**
 * Map a domain SourceRef-ish shape to a verification status, so callers can pass engine data
 * directly: a confirmed source → verified; one that needs a local check → needs-verification;
 * otherwise → estimate.
 */
export function verificationFromSource(source: {
  verifiedAt?: string;
  needsLocalVerification?: boolean;
}): VerificationStatus {
  if (source.verifiedAt) return "verified";
  if (source.needsLocalVerification) return "needs-verification";
  return "estimate";
}
