import { describe, expect, it } from "vitest";
import { chaikinSmooth } from "@/lib/yard-map/polygonGeometry";
import { polygonAreaNormalized } from "@/lib/yard-map/zoneModel";

const SQUARE = [
  { x: 0.2, y: 0.2 },
  { x: 0.8, y: 0.2 },
  { x: 0.8, y: 0.8 },
  { x: 0.2, y: 0.8 },
];

describe("chaikinSmooth", () => {
  it("doubles the point count per iteration", () => {
    expect(chaikinSmooth(SQUARE, 1)).toHaveLength(8);
    expect(chaikinSmooth(SQUARE, 2)).toHaveLength(16);
  });

  it("keeps points in [0,1] and stays near the original area", () => {
    const smooth = chaikinSmooth(SQUARE, 2);
    for (const p of smooth) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
    // Corner-cutting shrinks area slightly but should stay in the same ballpark.
    const before = polygonAreaNormalized(SQUARE);
    const after = polygonAreaNormalized(smooth);
    expect(after).toBeGreaterThan(before * 0.8);
    expect(after).toBeLessThanOrEqual(before);
  });

  it("returns a copy unchanged for degenerate input or no iterations", () => {
    expect(chaikinSmooth(SQUARE, 0)).toEqual(SQUARE);
    expect(chaikinSmooth([{ x: 0, y: 0 }], 2)).toHaveLength(1);
  });
});
