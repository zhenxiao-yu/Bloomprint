import { describe, expect, it } from "vitest";
import type { BloomprintPlan, DeterministicPlan } from "@/domain/models";
import { generateDeterministicPlan, refinePlan } from "@/domain/plan";
import { FIXTURES } from "@/domain";
import { diffPlans } from "@/lib/planDiff";

function wrap(plan: DeterministicPlan): BloomprintPlan {
  return { plan, enhancement: null, enhancedBy: "none", generatedAt: "" };
}

describe("diffPlans", () => {
  const base = wrap(generateDeterministicPlan(FIXTURES["oakville-front-yard"]));
  const cheaper = wrap(refinePlan(FIXTURES["oakville-front-yard"], "cheaper"));

  it("reports no budget increase when refined cheaper", () => {
    const d = diffPlans(base, cheaper);
    expect(d.budgetDelta.max).toBeLessThanOrEqual(0);
  });

  it("detects a style change when forced modern", () => {
    const modern = wrap(refinePlan(FIXTURES["oakville-front-yard"], "more-modern"));
    const d = diffPlans(base, modern);
    expect(d.styleB).toBe("Modern Minimal");
  });

  it("lists added/removed plants symmetrically", () => {
    const flowers = wrap(refinePlan(FIXTURES["privacy-side-yard"], "more-flowers"));
    const baseP = wrap(generateDeterministicPlan(FIXTURES["privacy-side-yard"]));
    const d = diffPlans(baseP, flowers);
    expect(Array.isArray(d.addedPlants)).toBe(true);
    expect(Array.isArray(d.removedPlants)).toBe(true);
  });

  it("is zero-diff for identical plans", () => {
    const d = diffPlans(base, base);
    expect(d.styleChanged).toBe(false);
    expect(d.addedPlants).toHaveLength(0);
    expect(d.removedPlants).toHaveLength(0);
    expect(d.budgetDelta).toEqual({ min: 0, max: 0 });
    expect(d.confidenceDelta).toBe(0);
  });
});
