import { describe, expect, it } from "vitest";
import { generateDeterministicPlan } from "@/domain/plan";
import { generateLayout } from "@/domain/layout";
import { FIXTURES } from "@/domain/fixtures";

describe("generateLayout", () => {
  const plan = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
  const layout = generateLayout(plan.plants);

  it("places every plant within board bounds", () => {
    expect(layout.length).toBe(plan.plants.length);
    for (const v of layout) {
      expect(v.x).toBeGreaterThanOrEqual(0);
      expect(v.x).toBeLessThanOrEqual(100);
      expect(v.y).toBeGreaterThanOrEqual(0);
      expect(v.y).toBeLessThanOrEqual(100);
      expect(v.scale).toBeGreaterThan(0);
    }
  });

  it("puts structural/screen plants behind front plants", () => {
    const byId = new Map(plan.plants.map((p) => [p.plantId, p]));
    const backYs = layout.filter((v) => ["screen", "structure"].includes(byId.get(v.plantId)!.role)).map((v) => v.y);
    const frontYs = layout.filter((v) => byId.get(v.plantId)!.role === "front").map((v) => v.y);
    if (backYs.length && frontYs.length) {
      expect(Math.max(...backYs)).toBeLessThan(Math.min(...frontYs));
    }
  });

  it("is deterministic", () => {
    expect(generateLayout(plan.plants)).toEqual(layout);
  });
});
