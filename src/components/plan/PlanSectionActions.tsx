"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Per-section workspace action. Minimal by design: opens the bounded section copilot
 * (docs/DECISIONS.md D15). "Rework" lives inside the copilot as refinement chips; global
 * tools live in the nav — so a single, calm entry point here keeps sections uncluttered.
 */
export function PlanSectionActions({ onAsk }: { onAsk: () => void }) {
  const t = useTranslations("Copilot");
  return (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-full text-muted-foreground hover:text-brand"
      onClick={onAsk}
    >
      <Sparkles className="size-3.5" aria-hidden />
      {t("askAi")}
    </Button>
  );
}
