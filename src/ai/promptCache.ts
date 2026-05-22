import { createHash } from "crypto";
import type { AIPlanEnhancement, DeterministicPlan, PlanProvider, RefinementAdjustment } from "@/domain/models";

const cache = new Map<string, AIPlanEnhancement | null>();
const PROMPT_VERSION = "bloomprint-presentation-v2";

export function summarizePlanForAi(plan: DeterministicPlan) {
  return {
    styleLabel: plan.styleLabel,
    goal: plan.intake.goal,
    insight: plan.insight,
    narrative: plan.narrative,
    plants: plan.plants.map((p) => ({
      id: p.plantId,
      name: p.commonName,
      qty: p.quantity,
      role: p.role,
      fitWarnings: p.fit.warnings,
    })),
    diyTotal: plan.budget.diyTotal,
    effort: plan.visualSummary.expectedEffort,
    confidence: plan.confidence,
    assumptions: plan.site.assumptions,
    risks: plan.risks.map((r) => ({ message: r.message, mitigation: r.mitigation })),
  };
}

export function aiCacheKey(
  provider: PlanProvider,
  plan: DeterministicPlan,
  adjustments: RefinementAdjustment[] = [],
): string {
  const body = JSON.stringify({ provider, promptVersion: PROMPT_VERSION, plan: summarizePlanForAi(plan), adjustments });
  return createHash("sha256").update(body).digest("hex");
}

export function getCachedEnhancement(key: string): AIPlanEnhancement | null | undefined {
  return cache.get(key);
}

export function setCachedEnhancement(key: string, value: AIPlanEnhancement | null): AIPlanEnhancement | null {
  cache.set(key, value);
  return value;
}
