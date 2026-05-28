import { describe, expect, it } from "vitest";

import { computeBulk } from "@/domain/toolbox/bulk";
import { areaSqftFromShape, perimeterFtFromShape } from "@/domain/toolbox/_geometry";

describe("areaSqftFromShape", () => {
  it("computes rectangle area in sq ft", () => {
    expect(areaSqftFromShape({ shape: "rectangle", unit: "ft", length: 10, width: 4 })).toBe(40);
  });
  it("converts metres to sq ft", () => {
    expect(areaSqftFromShape({ shape: "area", unit: "m", area: 10 })).toBeCloseTo(107.6, 0);
  });
  it("returns null when dimensions are missing", () => {
    expect(areaSqftFromShape({ shape: "rectangle", unit: "ft", length: 10 })).toBeNull();
  });
});

describe("perimeterFtFromShape", () => {
  it("computes rectangle perimeter", () => {
    expect(perimeterFtFromShape({ shape: "rectangle", unit: "ft", length: 10, width: 5 })).toBe(30);
  });
  it("returns null for known-area shape (no perimeter)", () => {
    expect(perimeterFtFromShape({ shape: "area", unit: "ft", area: 100 })).toBeNull();
  });
});

describe("computeBulk", () => {
  it("returns null when incomplete", () => {
    expect(computeBulk({ shape: "rectangle", unit: "ft", depth: 3 })).toBeNull();
  });

  it("computes volume, cubic yards, and a bag range", () => {
    // 100 sq ft at 3 in deep = 25 cu ft.
    const r = computeBulk({ shape: "area", unit: "ft", area: 100, depth: 3, bagSizeCuFt: 1.5, extraPct: 10 });
    expect(r).not.toBeNull();
    expect(r!.volumeCuFt).toBeCloseTo(25, 1);
    expect(r!.volumeCuYd).toBeCloseTo(0.93, 1);
    expect(r!.bags).toBe(Math.ceil(25 / 1.5)); // 17
    expect(r!.range.high).toBeGreaterThanOrEqual(r!.range.low);
  });

  it("normalizes metric depth (cm) to inches", () => {
    const r = computeBulk({ shape: "area", unit: "m", area: 10, depth: 5 });
    expect(r!.depthInches).toBeCloseTo(1.97, 1);
  });

  it("gives a tonnage band for bulk stone", () => {
    const r = computeBulk({ shape: "area", unit: "ft", area: 324, depth: 3 }); // 81 cu ft = 3 cu yd
    expect(r!.volumeCuYd).toBeCloseTo(3, 0);
    expect(r!.tons.low).toBeGreaterThan(0);
    expect(r!.tons.high).toBeGreaterThan(r!.tons.low);
  });
});
