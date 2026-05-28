import { describe, expect, it } from "vitest";

import { computeSoilPh } from "@/domain/toolbox/soilPh";
import { computeFertilizer } from "@/domain/toolbox/fertilizer";
import { computeRaisedBed } from "@/domain/toolbox/raisedBed";

describe("computeSoilPh", () => {
  it("returns null when area is incomplete", () => {
    expect(computeSoilPh({ shape: "rectangle", unit: "ft", currentPh: 6, targetPh: 7 })).toBeNull();
  });
  it("recommends lime to raise pH, scaled by area and texture", () => {
    // 1000 sq ft, +1.0 on loam → ~40 lb mid (±band)
    const r = computeSoilPh({ shape: "area", unit: "ft", area: 1000, currentPh: 6, targetPh: 7, texture: "loam" })!;
    expect(r.amendment).toBe("lime");
    expect(r.lbLow).toBeGreaterThan(30);
    expect(r.lbHigh).toBeLessThan(50);
    expect(r.kgHigh).toBeGreaterThan(0);
  });
  it("recommends sulfur to lower pH and flags an unsafe shift", () => {
    const r = computeSoilPh({ shape: "area", unit: "ft", area: 1000, currentPh: 7.5, targetPh: 5.5, texture: "clay" })!;
    expect(r.amendment).toBe("sulfur");
    expect(r.shiftTooBig).toBe(true);
  });
  it("recommends nothing when already at target", () => {
    expect(computeSoilPh({ shape: "area", unit: "ft", area: 500, currentPh: 6.5, targetPh: 6.5 })!.amendment).toBe("none");
  });
});

describe("computeFertilizer", () => {
  it("converts target N + bag N% into product weight", () => {
    // 1000 sq ft, 1 lb N/1000, 25% N → 4 lb product
    const r = computeFertilizer({ shape: "area", unit: "ft", area: 1000, targetNPer1000: 1, nitrogenPct: 25 })!;
    expect(r.nitrogenLb).toBeCloseTo(1, 2);
    expect(r.productLb).toBeCloseTo(4, 1);
    expect(r.applications).toBe(1);
  });
  it("splits high rates into multiple applications", () => {
    const r = computeFertilizer({ shape: "area", unit: "ft", area: 2000, targetNPer1000: 3, nitrogenPct: 30 })!;
    expect(r.applications).toBe(3);
    expect(r.productPerAppLb).toBeGreaterThan(0);
  });
});

describe("computeRaisedBed", () => {
  it("returns null when dimensions are incomplete", () => {
    expect(computeRaisedBed({ unit: "ft", height: 12 })).toBeNull();
  });
  it("splits volume into a topsoil/compost/aeration recipe", () => {
    // 4 ft × 8 ft × 12 in = 32 cu ft
    const r = computeRaisedBed({ unit: "ft", length: 4, width: 8, height: 12 })!;
    expect(r.totalCuFt).toBeCloseTo(32, 0);
    expect(r.topsoil.cuFt).toBeCloseTo(19.2, 0);
    expect(r.compost.cuFt).toBeCloseTo(9.6, 0);
    expect(r.aeration.cuFt).toBeCloseTo(3.2, 0);
    expect(r.pctOff).toBe(false);
  });
  it("flags a recipe that doesn't total 100%", () => {
    expect(
      computeRaisedBed({ unit: "ft", length: 4, width: 4, height: 12, topsoilPct: 50, compostPct: 30, aerationPct: 10 })!
        .pctOff,
    ).toBe(true);
  });
});
