import { describe, expect, it } from "vitest";
import { computeMulch, mulchAreaSqft, MAX_SAFE_MULCH_DEPTH_IN } from "@/domain/toolbox/mulch";

describe("mulchAreaSqft", () => {
  it("computes rectangle area in sq ft", () => {
    expect(mulchAreaSqft({ shape: "rectangle", unit: "ft", length: 10, width: 4 })).toBe(40);
  });
  it("computes circle area (π r²)", () => {
    // r=2 → π*4 ≈ 12.566 → rounded to 12.6
    expect(mulchAreaSqft({ shape: "circle", unit: "ft", radius: 2 })).toBeCloseTo(12.6, 1);
  });
  it("converts metric area to sq ft", () => {
    // 10 m² × 10.7639 ≈ 107.6 sq ft
    expect(mulchAreaSqft({ shape: "area", unit: "m", area: 10 })).toBeCloseTo(107.6, 1);
  });
  it("returns null when required dimensions are missing", () => {
    expect(mulchAreaSqft({ shape: "rectangle", unit: "ft", length: 10 })).toBeNull();
    expect(mulchAreaSqft({ shape: "circle", unit: "ft" })).toBeNull();
  });
});

describe("computeMulch", () => {
  it("computes volume and bags for a 40 sq ft bed at 2 in, 2 cu ft bags", () => {
    // 40 sq ft × (2/12 ft) = 6.67 cu ft → ceil(6.67/2) = 4 bags
    const r = computeMulch({ shape: "rectangle", unit: "ft", length: 10, width: 4, depth: 2, bagSizeCuFt: 2, extraPct: 0 })!;
    expect(r.areaSqft).toBe(40);
    expect(r.volumeCuFt).toBeCloseTo(6.67, 1);
    expect(r.bags).toBe(4);
    expect(r.bagsWithExtra).toBe(4); // 0% extra
    expect(r.warnings).toHaveLength(0);
  });

  it("adds bags for the buffer (10% extra rounds up)", () => {
    // 6.67 × 1.10 = 7.33 → ceil(7.33/2) = 4; use a bigger bed to see the buffer bite
    const r = computeMulch({ shape: "rectangle", unit: "ft", length: 20, width: 10, depth: 3, bagSizeCuFt: 2, extraPct: 20 })!;
    // area 200, depth 3in=0.25ft → 50 cu ft; bags=ceil(50/2)=25; +20% → 60/2=30
    expect(r.bags).toBe(25);
    expect(r.bagsWithExtra).toBe(30);
    expect(r.range).toEqual({ low: 25, high: 30 });
  });

  it("warns when depth exceeds the safe maximum", () => {
    const r = computeMulch({ shape: "rectangle", unit: "ft", length: 10, width: 10, depth: MAX_SAFE_MULCH_DEPTH_IN + 1, bagSizeCuFt: 2 })!;
    expect(r.warnings.some((w) => /deeper than/i.test(w))).toBe(true);
  });

  it("treats metric depth as centimeters", () => {
    // 5 cm ≈ 1.97 in (no warning), area 10 m² ≈ 107.6 sq ft
    const r = computeMulch({ shape: "area", unit: "m", area: 10, depth: 5, bagSizeCuFt: 2 })!;
    expect(r.depthInches).toBeCloseTo(1.97, 1);
    expect(r.warnings).toHaveLength(0);
    expect(r.areaSqft).toBeCloseTo(107.6, 1);
  });

  it("returns null when dimensions are incomplete", () => {
    expect(computeMulch({ shape: "rectangle", unit: "ft", length: 10, depth: 2, bagSizeCuFt: 2, extraPct: 10 })).toBeNull();
  });
});
