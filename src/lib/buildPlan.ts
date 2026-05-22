/**
 * buildBloomprintPlan — the one place the pipeline is assembled:
 * deterministic plan (source of truth) → optional AI presentation → validation → BloomprintPlan.
 * Used by the /api/plan route. The deterministic plan always stands on its own.
 */
import {
  AIPlanEnhancement,
  type BloomprintPlan,
  type PlanProvider,
  type RefinementAdjustment,
  type YardIntake,
} from "@/domain/models";
import { generateDeterministicPlan } from "@/domain";
import { getProvider } from "@/ai";

export async function buildBloomprintPlan(
  intake: YardIntake,
  adjustments: RefinementAdjustment[] = [],
): Promise<BloomprintPlan> {
  const plan = generateDeterministicPlan(intake, { adjustments });

  const provider = getProvider();
  let enhancement: AIPlanEnhancement | null = null;
  let enhancedBy: PlanProvider = "none";

  try {
    const raw = await provider.enhancePlan(plan);
    const parsed = raw ? AIPlanEnhancement.safeParse(raw) : null;
    if (parsed?.success) {
      enhancement = parsed.data;
      enhancedBy = provider.name;
    }
  } catch {
    // Presentation is best-effort; the deterministic plan is the source of truth.
    enhancement = null;
    enhancedBy = "none";
  }

  return {
    plan,
    enhancement,
    enhancedBy,
    generatedAt: new Date().toISOString(),
  };
}
