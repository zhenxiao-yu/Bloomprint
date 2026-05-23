import { describe, expect, it } from "vitest";
import {
  YardIntake,
  Measurement,
  PriceBand,
  SourceRef,
  RiskWarning,
  GuideLink,
  PlanTier,
  generateDeterministicPlan,
  FIXTURES,
} from "@/domain";

describe("Free/Open Data Mode — additive schema is backward compatible", () => {
  it("YardIntake still parses with only the historical required fields", () => {
    const intake = YardIntake.parse({ regionId: "gta-ontario", goal: "general" });
    // New fields are optional → absent, never blocking a minimal intake.
    expect(intake.scope).toBeUndefined();
    expect(intake.problemType).toBeUndefined();
    expect(intake.measurement).toBeUndefined();
  });

  it("YardIntake accepts the new optional fields", () => {
    const intake = YardIntake.parse({
      regionId: "gta-ontario",
      goal: "privacy",
      scope: "spot_fix",
      problemType: "dead_plants",
      measurement: { length: 6, width: 1.2, unit: "m", source: "manual" },
    });
    expect(intake.scope).toBe("spot_fix");
    expect(intake.measurement?.confidence).toBe("low"); // default applied
    expect(intake.measurement?.unit).toBe("m");
  });

  it("Measurement defaults unit/source/confidence", () => {
    const m = Measurement.parse({ area: 40 });
    expect(m.unit).toBe("ft");
    expect(m.source).toBe("estimated");
    expect(m.confidence).toBe("low");
  });

  it("PriceBand structurally pins isExactPrice to false and defaults currency", () => {
    const band = PriceBand.parse({ range: { min: 20, max: 40 } });
    expect(band.isExactPrice).toBe(false);
    expect(band.currency).toBe("CAD");
  });

  it("SourceRef accepts the new verifiedAt/notes without breaking existing shape", () => {
    const ref = SourceRef.parse({ name: "USDA", level: 3, verifiedAt: "2026-05-23", notes: "zone 6a" });
    expect(ref.verifiedAt).toBe("2026-05-23");
    expect(ref.notes).toBe("zone 6a");
  });

  it("RiskWarning still parses without the new optional fields", () => {
    const r = RiskWarning.parse({ id: "x", severity: "low", message: "m", mitigation: "f" });
    expect(r.appliesTo).toBeUndefined();
    expect(r.sourceRefs).toBeUndefined();
  });

  it("GuideLink and PlanTier validate", () => {
    expect(() =>
      GuideLink.parse({ topic: "add_mulch", title: "Mulching", url: "https://x", kind: "search" }),
    ).not.toThrow();
    expect(() =>
      PlanTier.parse({
        tier: "better_fix",
        label: "Better",
        summary: "s",
        estTotal: { min: 100, max: 200 },
      }),
    ).not.toThrow();
  });

  it("a default (section) plan now carries quick/better/best tiers and per-phase guides", () => {
    const plan = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
    expect((plan.tiers ?? []).map((t) => t.tier)).toEqual(["quick_fix", "better_fix", "best_fix"]);
    for (const phase of plan.installPhases) {
      expect((phase.guides ?? []).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("a spot-fix plan stays tiny: ≤3 plants, no tiers, no stone/lighting", () => {
    const plan = generateDeterministicPlan({ ...FIXTURES["oakville-front-yard"], scope: "spot_fix" });
    expect(plan.plants.length).toBeLessThanOrEqual(3);
    expect(plan.tiers ?? []).toEqual([]);
    expect(plan.shoppingList.some((i) => i.category === "lighting")).toBe(false);
  });
});
