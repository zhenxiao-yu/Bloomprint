import { describe, expect, it } from "vitest";

import { computeSpacing } from "@/domain/toolbox/spacing";
import { computeWatering } from "@/domain/toolbox/watering";

describe("computeSpacing", () => {
  it("returns null when area is incomplete", () => {
    expect(computeSpacing({ shape: "rectangle", unit: "ft", spacing: 12 })).toBeNull();
  });
  it("counts plants on a square grid (12 in spacing = 1 per sq ft)", () => {
    const r = computeSpacing({ shape: "area", unit: "ft", area: 100, spacing: 12, pattern: "square" });
    expect(r!.perPlantSqft).toBeCloseTo(1, 2);
    expect(r!.plants).toBe(100);
  });
  it("triangular packing fits more than square for the same spacing", () => {
    const sq = computeSpacing({ shape: "area", unit: "ft", area: 100, spacing: 12, pattern: "square" })!;
    const tri = computeSpacing({ shape: "area", unit: "ft", area: 100, spacing: 12, pattern: "triangular" })!;
    expect(tri.plants).toBeGreaterThan(sq.plants);
  });
  it("converts metric spacing (cm) to inches", () => {
    const r = computeSpacing({ shape: "area", unit: "m", area: 10, spacing: 30 });
    expect(r!.spacingInches).toBeCloseTo(11.8, 0);
  });
});

describe("computeWatering", () => {
  it("computes run time: 1 in target at 2 in/hr = 30 min", () => {
    expect(computeWatering({ outputInPerHr: 2, targetIn: 1 })!.minutes).toBe(30);
  });
  it("defaults target to 1 inch", () => {
    expect(computeWatering({ outputInPerHr: 1 })!.minutes).toBe(60);
  });
});
