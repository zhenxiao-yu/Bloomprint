import { describe, expect, it } from "vitest";
import { buildPlanTiers } from "@/domain/tiers";
import type { YardIntake } from "@/domain/models";

const intake = (scope?: YardIntake["scope"]): YardIntake => ({
  regionId: "gta-ontario", goal: "curb-appeal", scope, effortLevel: "moderate",
  hasPhoto: false, sun: "unknown", soil: "unknown", drainage: "unknown",
});

describe("buildPlanTiers", () => {
  it("returns quick/better/best with monotonic totals", () => {
    const tiers = buildPlanTiers(intake("section_plan"), { min: 400, max: 800 });
    expect(tiers.map((t) => t.tier)).toEqual(["quick_fix", "better_fix", "best_fix"]);
    expect(tiers[0].estTotal.max).toBeLessThan(tiers[1].estTotal.max);
    expect(tiers[1].estTotal.max).toBeLessThan(tiers[2].estTotal.max);
    expect(tiers[0].estTotal.min).toBeLessThanOrEqual(tiers[1].estTotal.min);
  });

  it("carries the adjustment sets each tier represents", () => {
    const tiers = buildPlanTiers(intake("section_plan"), { min: 400, max: 800 });
    expect(tiers[0].appliedAdjustments).toContain("cheaper");
    expect(tiers[2].appliedAdjustments).toContain("premium-look");
  });

  it("skips tiers for a spot fix", () => {
    expect(buildPlanTiers(intake("spot_fix"), { min: 100, max: 200 })).toEqual([]);
  });
});
