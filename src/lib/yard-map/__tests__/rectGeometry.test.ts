import { describe, expect, it } from "vitest";
import { polygonAreaNormalized } from "@/lib/yard-map/zoneModel";
import {
  normalizedLineLengthPx,
  normalizedToPx,
  polygonToRect,
  pxToNormalized,
  rectFromCorners,
  rectToPolygon,
} from "@/lib/yard-map/rectGeometry";

describe("pxToNormalized", () => {
  it("maps pixel coordinates to a 0..1 range", () => {
    expect(pxToNormalized(50, 30, 100, 60)).toEqual({ x: 0.5, y: 0.5 });
  });

  it("clamps out-of-bounds coordinates into [0,1]", () => {
    expect(pxToNormalized(-10, 200, 100, 60)).toEqual({ x: 0, y: 1 });
  });

  it("returns the origin when the stage has no size", () => {
    expect(pxToNormalized(50, 30, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("normalizedToPx", () => {
  it("is the inverse of pxToNormalized for in-bounds points", () => {
    const norm = pxToNormalized(40, 24, 200, 120);
    expect(normalizedToPx(norm, 200, 120)).toEqual({ x: 40, y: 24 });
  });
});

describe("rectFromCorners", () => {
  it("produces a non-negative rect regardless of drag direction", () => {
    const a = { x: 0.8, y: 0.7 };
    const b = { x: 0.2, y: 0.1 };
    const rect = rectFromCorners(a, b);
    expect(rect.x).toBeCloseTo(0.2, 10);
    expect(rect.y).toBeCloseTo(0.1, 10);
    expect(rect.width).toBeCloseTo(0.6, 10);
    expect(rect.height).toBeCloseTo(0.6, 10);
  });
});

describe("rectToPolygon", () => {
  it("emits 4 corner points whose area matches the rect", () => {
    const rect = { x: 0.1, y: 0.2, width: 0.4, height: 0.3 };
    const poly = rectToPolygon(rect);
    expect(poly).toHaveLength(4);
    // Shoelace area of an axis-aligned rect equals width * height.
    expect(polygonAreaNormalized(poly)).toBeCloseTo(0.4 * 0.3, 10);
  });
});

describe("polygonToRect", () => {
  it("recovers the bounding rect from rectToPolygon output", () => {
    const rect = { x: 0.1, y: 0.2, width: 0.4, height: 0.3 };
    const recovered = polygonToRect(rectToPolygon(rect));
    expect(recovered).not.toBeNull();
    expect(recovered!.x).toBeCloseTo(rect.x, 10);
    expect(recovered!.y).toBeCloseTo(rect.y, 10);
    expect(recovered!.width).toBeCloseTo(rect.width, 10);
    expect(recovered!.height).toBeCloseTo(rect.height, 10);
  });

  it("returns null for an empty polygon", () => {
    expect(polygonToRect([])).toBeNull();
  });
});

describe("normalizedLineLengthPx", () => {
  it("measures the pixel length of a normalized line on a stage", () => {
    // 3-4-5 triangle: dx = 0.3*100 = 30, dy = 0.4*100 = 40 → 50.
    const len = normalizedLineLengthPx({ x: 0, y: 0 }, { x: 0.3, y: 0.4 }, 100, 100);
    expect(len).toBeCloseTo(50, 10);
  });
});
