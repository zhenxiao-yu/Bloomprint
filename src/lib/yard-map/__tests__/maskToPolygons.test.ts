import { describe, expect, it } from "vitest";
import { maskToPolygons } from "@/lib/yard-map/maskToPolygons";
import { polygonAreaNormalized, type Point } from "@/lib/yard-map/zoneModel";

/**
 * Build a row-major label grid where every cell defaults to `bg` and the given
 * inclusive cell rectangles are painted with `fg`. Keeps the hand-built
 * fixtures below readable.
 */
function makeGrid(
  width: number,
  height: number,
  fg: number,
  bg: number,
  blocks: { x0: number; y0: number; x1: number; y1: number }[],
): number[] {
  const grid = new Array<number>(width * height).fill(bg);
  for (const { x0, y0, x1, y1 } of blocks) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        grid[y * width + x] = fg;
      }
    }
  }
  return grid;
}

/** Axis-aligned bounding box of a polygon, for asserting against block extents. */
function bbox(points: Point[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    xmin: Math.min(...xs),
    xmax: Math.max(...xs),
    ymin: Math.min(...ys),
    ymax: Math.max(...ys),
  };
}

describe("maskToPolygons — single solid block", () => {
  it("returns one polygon whose bounding box matches the block", () => {
    // 6x6 grid, solid 3x3 block at cells (1..3, 1..3). The 0.5 contour sits at
    // the matched cell centers, so grid bounds are [1,4] → normalized [1/6,4/6].
    const grid = makeGrid(6, 6, 1, 0, [{ x0: 1, y0: 1, x1: 3, y1: 3 }]);
    const polys = maskToPolygons(grid, 6, 6, 1);

    expect(polys).toHaveLength(1);
    const box = bbox(polys[0]);
    // ±0.5 cell == ±1/12 ≈ 0.083; assert to 1 decimal place to stay tolerant.
    expect(box.xmin).toBeCloseTo(1 / 6, 1);
    expect(box.xmax).toBeCloseTo(4 / 6, 1);
    expect(box.ymin).toBeCloseTo(1 / 6, 1);
    expect(box.ymax).toBeCloseTo(4 / 6, 1);
    // Marching squares chamfers corners, so the simplified ring is an octagon
    // (≥4 distinct points), with the closing duplicate removed.
    expect(polys[0].length).toBeGreaterThanOrEqual(4);
    const first = polys[0][0];
    const last = polys[0][polys[0].length - 1];
    expect(first.x === last.x && first.y === last.y).toBe(false);
  });

  it("emits points clamped to the unit square", () => {
    const grid = makeGrid(6, 6, 1, 0, [{ x0: 1, y0: 1, x1: 3, y1: 3 }]);
    for (const p of maskToPolygons(grid, 6, 6, 1)[0]) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });
});

describe("maskToPolygons — multiple blocks", () => {
  it("returns two polygons, largest area first", () => {
    // 10x10: a big 4x4 block (area ≈ 0.155) and a small 2x2 block (≈ 0.035).
    const grid = makeGrid(10, 10, 1, 0, [
      { x0: 1, y0: 1, x1: 4, y1: 4 },
      { x0: 6, y0: 6, x1: 7, y1: 7 },
    ]);
    const polys = maskToPolygons(grid, 10, 10, 1);

    expect(polys).toHaveLength(2);
    const a0 = polygonAreaNormalized(polys[0]);
    const a1 = polygonAreaNormalized(polys[1]);
    expect(a0).toBeGreaterThan(a1);
    expect(a0).toBeCloseTo(0.155, 2);
    expect(a1).toBeCloseTo(0.035, 2);

    // The largest polygon is the top-left block.
    const big = bbox(polys[0]);
    expect(big.xmin).toBeCloseTo(0.1, 1);
    expect(big.xmax).toBeCloseTo(0.5, 1);
  });
});

describe("maskToPolygons — minAreaFraction filtering", () => {
  it("drops a tiny speck below the default threshold", () => {
    // 10x10: big 5x5 block (area ≈ 0.245) plus a single-cell speck (≈ 0.005).
    // Default minAreaFraction 0.01 removes the speck (0.005 < 0.01).
    const grid = makeGrid(10, 10, 1, 0, [
      { x0: 1, y0: 1, x1: 5, y1: 5 },
      { x0: 8, y0: 8, x1: 8, y1: 8 },
    ]);
    expect(maskToPolygons(grid, 10, 10, 1)).toHaveLength(1);
  });

  it("keeps the speck when minAreaFraction is lowered", () => {
    const grid = makeGrid(10, 10, 1, 0, [
      { x0: 1, y0: 1, x1: 5, y1: 5 },
      { x0: 8, y0: 8, x1: 8, y1: 8 },
    ]);
    const polys = maskToPolygons(grid, 10, 10, 1, { minAreaFraction: 0.001 });
    expect(polys).toHaveLength(2);
    // Speck survives as the smaller, last polygon.
    expect(polygonAreaNormalized(polys[1])).toBeCloseTo(0.005, 3);
  });
});

describe("maskToPolygons — maxPolygons cap", () => {
  it("returns at most maxPolygons, keeping the largest", () => {
    // 12x12: three blocks with areas ≈ 0.108, 0.059, 0.010.
    const grid = makeGrid(12, 12, 1, 0, [
      { x0: 1, y0: 1, x1: 4, y1: 4 },
      { x0: 6, y0: 6, x1: 8, y1: 8 },
      { x0: 10, y0: 10, x1: 11, y1: 10 },
    ]);
    // Default minAreaFraction 0.01 keeps all three; cap to 2 largest.
    const polys = maskToPolygons(grid, 12, 12, 1, {
      maxPolygons: 2,
      minAreaFraction: 0.005,
    });
    expect(polys).toHaveLength(2);
    expect(polygonAreaNormalized(polys[0])).toBeGreaterThan(
      polygonAreaNormalized(polys[1]),
    );
    expect(polygonAreaNormalized(polys[0])).toBeCloseTo(0.108, 2);
  });
});

describe("maskToPolygons — edge cases", () => {
  it("returns [] when no cells match the target label", () => {
    const grid = makeGrid(6, 6, 1, 0, [{ x0: 1, y0: 1, x1: 3, y1: 3 }]);
    expect(maskToPolygons(grid, 6, 6, 7)).toEqual([]);
  });

  it("returns [] for non-positive dimensions", () => {
    const grid = makeGrid(4, 4, 1, 0, [{ x0: 1, y0: 1, x1: 2, y1: 2 }]);
    expect(maskToPolygons(grid, 0, 4, 1)).toEqual([]);
    expect(maskToPolygons(grid, 4, 0, 1)).toEqual([]);
    expect(maskToPolygons(grid, -4, 4, 1)).toEqual([]);
  });

  it("returns [] when labels is shorter than width*height", () => {
    // 6x6 needs 36 cells; supply only 10.
    const short = new Array<number>(10).fill(1);
    expect(maskToPolygons(short, 6, 6, 1)).toEqual([]);
  });

  it("returns [] when a thin region degenerates after simplification", () => {
    // A 1-cell-tall horizontal strip has zero enclosed-ish area and collapses
    // under a generous tolerance, leaving fewer than 3 distinct points.
    const grid = makeGrid(8, 4, 1, 0, [{ x0: 1, y0: 1, x1: 6, y1: 1 }]);
    expect(maskToPolygons(grid, 8, 4, 1, { simplifyTolerance: 0.9 })).toEqual([]);
  });

  it("accepts a typed array (e.g. Uint8Array) as the label buffer", () => {
    const dense = makeGrid(6, 6, 1, 0, [{ x0: 1, y0: 1, x1: 3, y1: 3 }]);
    const typed = Uint8Array.from(dense);
    expect(maskToPolygons(typed, 6, 6, 1)).toHaveLength(1);
  });
});
