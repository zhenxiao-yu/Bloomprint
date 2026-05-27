import { describe, expect, it } from "vitest";

import { computeEdging } from "@/domain/toolbox/edging";
import { computeBedArea } from "@/domain/toolbox/bedArea";

describe("computeEdging", () => {
  it("returns null for the known-area shape (no perimeter)", () => {
    expect(computeEdging({ shape: "area", unit: "ft", area: 100 })).toBeNull();
  });
  it("counts pieces around a rectangle perimeter with buffer", () => {
    // 10×5 rectangle → perimeter 30 ft; 8 ft pieces → 4 pieces, ≥4 with buffer.
    const r = computeEdging({ shape: "rectangle", unit: "ft", length: 10, width: 5, pieceFt: 8, extraPct: 10 });
    expect(r!.perimeterFt).toBe(30);
    expect(r!.pieces).toBe(4);
    expect(r!.range.high).toBeGreaterThanOrEqual(r!.pieces);
  });
});

describe("computeBedArea", () => {
  it("returns null when incomplete", () => {
    expect(computeBedArea({ shape: "circle", unit: "ft" })).toBeNull();
  });
  it("reports area in both systems and a perimeter for a rectangle", () => {
    const r = computeBedArea({ shape: "rectangle", unit: "ft", length: 12, width: 9 });
    expect(r!.areaSqft).toBe(108);
    expect(r!.areaSqm).toBeCloseTo(10.0, 0);
    expect(r!.perimeterFt).toBe(42);
  });
  it("has no perimeter for known-area input", () => {
    expect(computeBedArea({ shape: "area", unit: "ft", area: 200 })!.perimeterFt).toBeNull();
  });
});
