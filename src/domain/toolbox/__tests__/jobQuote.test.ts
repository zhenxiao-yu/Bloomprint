import { describe, expect, it } from "vitest";

import { computeJobQuote } from "@/domain/toolbox/jobQuote";

describe("computeJobQuote", () => {
  it("returns null without an area", () => {
    expect(computeJobQuote({ unit: "ft", service: "sod" })).toBeNull();
  });

  it("computes hours, labor, material band, and a margin'd price range", () => {
    // 1000 sq ft sod: 1.5 h/100 × 10 × 1.15 = 17.25 h; labor 17.25×65 ≈ 1121
    const r = computeJobQuote({ unit: "ft", area: 1000, service: "sod", crewRate: 65, marginPct: 30 })!;
    expect(r.areaSqft).toBe(1000);
    expect(r.hours).toBeCloseTo(17.3, 1);
    expect(r.laborCost).toBeGreaterThan(1000);
    expect(r.material.high).toBeGreaterThan(r.material.low);
    expect(r.price.high).toBeGreaterThan(r.price.low);
    expect(r.perSqft.high).toBeGreaterThan(r.perSqft.low);
    // margin makes price exceed raw cost
    expect(r.price.low).toBeGreaterThan(r.laborCost + r.material.low);
  });

  it("converts square metres to square feet", () => {
    const r = computeJobQuote({ unit: "m", area: 10, service: "mulch" })!;
    expect(r.areaSqft).toBeCloseTo(107.6, 0);
  });

  it("zero margin yields price == cost", () => {
    const r = computeJobQuote({ unit: "ft", area: 500, service: "mulch", crewRate: 50, marginPct: 0 })!;
    expect(r.price.low).toBe(r.laborCost + r.material.low);
  });
});
