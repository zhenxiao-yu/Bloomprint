/**
 * Quick / Better / Best framing of the same plan.
 *
 * Deterministic and cheap: rather than re-running the whole engine three times (which would risk
 * divergence and a circular import), we frame the plan's own DIY total under the adjustment sets the
 * refinement chips already model. Totals are clearly-labeled estimate RANGES, never exact prices.
 */
import type { MoneyRange, PlanTier, RefinementAdjustment, YardIntake } from "@/domain/models";

interface TierSpec {
  tier: PlanTier["tier"];
  label: string;
  summary: string;
  /** Multiplier applied to the base DIY total (monotonic across tiers). */
  factor: number;
  appliedAdjustments: RefinementAdjustment[];
}

const TIER_SPECS: TierSpec[] = [
  {
    tier: "quick_fix",
    label: "Quick fix",
    summary: "Lower budget, fewer varieties, lighter labor — get it tidy this weekend.",
    factor: 0.65,
    appliedAdjustments: ["cheaper", "easier"],
  },
  {
    tier: "better_fix",
    label: "Better fix",
    summary: "The recommended balance of looks, durability, and effort.",
    factor: 1,
    appliedAdjustments: [],
  },
  {
    tier: "best_fix",
    label: "Best fix",
    summary: "A premium finish — better materials and a more finished look.",
    factor: 1.4,
    appliedAdjustments: ["premium-look"],
  },
];

function scale(range: MoneyRange, factor: number): MoneyRange {
  return { min: Math.round(range.min * factor), max: Math.round(range.max * factor) };
}

/**
 * Build the three tiers from the plan's base DIY total. Spot fixes pass an empty list upstream
 * (a single small fix doesn't need tiering).
 */
export function buildPlanTiers(intake: YardIntake, baseDiyTotal: MoneyRange): PlanTier[] {
  if (intake.scope === "spot_fix") return [];
  return TIER_SPECS.map((spec) => ({
    tier: spec.tier,
    label: spec.label,
    summary: spec.summary,
    estTotal: scale(baseDiyTotal, spec.factor),
    appliedAdjustments: spec.appliedAdjustments,
  }));
}
