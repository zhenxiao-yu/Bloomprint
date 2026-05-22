/**
 * AI provider interface — intentionally minimal (docs/DECISIONS.md D2).
 *
 * The only thing AI does is *present* a finished deterministic plan more warmly. It cannot add
 * or change facts. Implementations must Zod-validate their own output and return `null` on any
 * failure so the caller falls back to the deterministic narrative.
 */
import type { AIPlanEnhancement, DeterministicPlan, PlanProvider } from "@/domain/models";

export interface AIProvider {
  readonly name: PlanProvider;
  enhancePlan(plan: DeterministicPlan): Promise<AIPlanEnhancement | null>;
}
