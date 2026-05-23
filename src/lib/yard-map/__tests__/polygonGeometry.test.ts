import { describe, expect, it } from "vitest";
import type { Point } from "@/lib/yard-map/zoneModel";
import {
  distanceToSegment,
  insertVertexOnNearestEdge,
  movePolygon,
  moveVertex,
  nearestVertexIndex,
  pointInPolygon,
  polygonCentroid,
  polygonsInRect,
  removeVertex,
  snapRightAngles,
  snapToGrid,
} from "@/lib/yard-map/polygonGeometry";

const unitSquare: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

describe("pointInPolygon", () => {
  it("returns true for a point inside the unit square", () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, unitSquare)).toBe(true);
  });

  it("returns false for a point outside the unit square", () => {
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, unitSquare)).toBe(false);
    expect(pointInPolygon({ x: -0.1, y: 0.5 }, unitSquare)).toBe(false);
  });

  it("handles a concave polygon (point in the notch is outside)", () => {
    // An L-shape: full bottom band plus a left column, leaving the top-right
    // quadrant (x>0.5, y>0.5) carved out as empty space.
    const lShape: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(pointInPolygon({ x: 0.25, y: 0.75 }, lShape)).toBe(true); // left column
    expect(pointInPolygon({ x: 0.75, y: 0.25 }, lShape)).toBe(true); // bottom band
    expect(pointInPolygon({ x: 0.75, y: 0.75 }, lShape)).toBe(false); // carved notch
  });

  it("returns false for degenerate polygons (<3 points)", () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, [])).toBe(false);
    expect(pointInPolygon({ x: 0, y: 0 }, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
  });
});

describe("polygonCentroid", () => {
  it("returns the center for a square", () => {
    const c = polygonCentroid(unitSquare);
    expect(c.x).toBeCloseTo(0.5, 10);
    expect(c.y).toBeCloseTo(0.5, 10);
  });

  it("is unaffected by winding order", () => {
    const reversed = [...unitSquare].reverse();
    const c = polygonCentroid(reversed);
    expect(c.x).toBeCloseTo(0.5, 10);
    expect(c.y).toBeCloseTo(0.5, 10);
  });

  it("falls back to the average for degenerate (collinear, zero-area) input", () => {
    const collinear: Point[] = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 1, y: 0 },
    ];
    const c = polygonCentroid(collinear);
    expect(c.x).toBeCloseTo(0.5, 10);
    expect(c.y).toBeCloseTo(0, 10);
  });

  it("falls back to the average for <3 points", () => {
    const c = polygonCentroid([{ x: 0.2, y: 0.4 }, { x: 0.6, y: 0.8 }]);
    expect(c.x).toBeCloseTo(0.4, 10);
    expect(c.y).toBeCloseTo(0.6, 10);
  });

  it("returns the origin for an empty polygon", () => {
    expect(polygonCentroid([])).toEqual({ x: 0, y: 0 });
  });
});

describe("movePolygon", () => {
  it("translates every vertex without clamping", () => {
    const moved = movePolygon(unitSquare, 0.5, -0.2);
    expect(moved[0]).toEqual({ x: 0.5, y: -0.2 });
    expect(moved[2]).toEqual({ x: 1.5, y: 0.8 });
  });

  it("does not mutate the input", () => {
    const input: Point[] = [{ x: 0, y: 0 }];
    movePolygon(input, 1, 1);
    expect(input[0]).toEqual({ x: 0, y: 0 });
  });
});

describe("moveVertex", () => {
  it("replaces the vertex at the index, clamped to [0,1]", () => {
    const next = moveVertex(unitSquare, 0, { x: 1.7, y: -0.5 });
    expect(next[0]).toEqual({ x: 1, y: 0 });
    expect(next[1]).toEqual({ x: 1, y: 0 });
  });

  it("returns an unchanged copy for an out-of-range index", () => {
    const next = moveVertex(unitSquare, 99, { x: 0.5, y: 0.5 });
    expect(next).toEqual(unitSquare);
    expect(next).not.toBe(unitSquare);
  });
});

describe("insertVertexOnNearestEdge", () => {
  it("increases the length by exactly 1", () => {
    const next = insertVertexOnNearestEdge(unitSquare, { x: 0.5, y: 0.02 });
    expect(next).toHaveLength(unitSquare.length + 1);
  });

  it("inserts the new point on the chosen (nearest) edge", () => {
    // Closest to the top edge (y≈0) between vertex 0 and vertex 1.
    const at = { x: 0.5, y: 0.02 };
    const next = insertVertexOnNearestEdge(unitSquare, at);
    expect(next[1]).toEqual(at);
    // The new point lies (essentially) on the top edge segment.
    const d = distanceToSegment(next[1], unitSquare[0], unitSquare[1]);
    expect(d).toBeCloseTo(0.02, 10);
  });

  it("appends when there is no edge to split (<2 points)", () => {
    expect(insertVertexOnNearestEdge([], { x: 0.3, y: 0.3 })).toEqual([{ x: 0.3, y: 0.3 }]);
  });
});

describe("removeVertex", () => {
  it("removes the vertex at the index when above the 3-point minimum", () => {
    const next = removeVertex(unitSquare, 1);
    expect(next).toHaveLength(3);
    expect(next).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
  });

  it("will not drop below 3 points (returns a copy)", () => {
    const tri: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    const next = removeVertex(tri, 0);
    expect(next).toEqual(tri);
    expect(next).not.toBe(tri);
  });

  it("returns an unchanged copy for an out-of-range index", () => {
    expect(removeVertex(unitSquare, -1)).toEqual(unitSquare);
  });
});

describe("snapToGrid", () => {
  it("rounds to the nearest grid step", () => {
    expect(snapToGrid({ x: 0.123, y: 0.071 }, 0.05)).toEqual({ x: 0.1, y: 0.05 });
  });

  it("rounds toward the nearer step in both directions", () => {
    // 0.08 → 0.1 (up), 0.11 → 0.1 (down).
    const snapped = snapToGrid({ x: 0.08, y: 0.11 }, 0.05);
    expect(snapped.x).toBeCloseTo(0.1, 10);
    expect(snapped.y).toBeCloseTo(0.1, 10);
  });

  it("is a no-op for a non-positive step", () => {
    expect(snapToGrid({ x: 0.123, y: 0.456 }, 0)).toEqual({ x: 0.123, y: 0.456 });
  });
});

describe("snapRightAngles", () => {
  it("makes a near-horizontal edge exactly axis-aligned", () => {
    // Edge from (0,0) to (1,0.03): ~1.7° off horizontal, within default 12°.
    const poly: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0.03 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const next = snapRightAngles(poly);
    // The first edge's two endpoints now share a y coordinate.
    expect(next[0].y).toBeCloseTo(next[1].y, 10);
  });

  it("makes a near-vertical edge exactly axis-aligned", () => {
    const poly: Point[] = [
      { x: 0, y: 0 },
      { x: 0.02, y: 1 },
      { x: 1, y: 1 },
    ];
    const next = snapRightAngles(poly);
    expect(next[0].x).toBeCloseTo(next[1].x, 10);
  });

  it("leaves a diagonal edge untouched (outside tolerance)", () => {
    const diag: Point[] = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    const next = snapRightAngles(diag, 12);
    // The 45° edge is far outside tolerance, so its endpoints keep distinct x and y.
    expect(next[0].x).not.toBeCloseTo(next[1].x, 5);
    expect(next[0].y).not.toBeCloseTo(next[1].y, 5);
  });
});

describe("nearestVertexIndex", () => {
  it("returns the nearest vertex within maxDist", () => {
    expect(nearestVertexIndex(unitSquare, { x: 0.95, y: 0.05 }, 0.2)).toBe(1);
  });

  it("returns null when no vertex is within maxDist", () => {
    expect(nearestVertexIndex(unitSquare, { x: 0.5, y: 0.5 }, 0.1)).toBeNull();
  });

  it("returns null for an empty polygon", () => {
    expect(nearestVertexIndex([], { x: 0, y: 0 }, 1)).toBeNull();
  });
});

describe("polygonsInRect", () => {
  it("selects only polygons whose centroid is inside the rect", () => {
    const a: Point[] = [
      { x: 0.0, y: 0.0 },
      { x: 0.2, y: 0.0 },
      { x: 0.2, y: 0.2 },
      { x: 0.0, y: 0.2 },
    ]; // centroid ~ (0.1, 0.1) — inside
    const b: Point[] = [
      { x: 0.8, y: 0.8 },
      { x: 1.0, y: 0.8 },
      { x: 1.0, y: 1.0 },
      { x: 0.8, y: 1.0 },
    ]; // centroid ~ (0.9, 0.9) — outside
    const rect = { x: 0, y: 0, width: 0.5, height: 0.5 };
    expect(polygonsInRect([a, b], rect)).toEqual([0]);
  });

  it("returns an empty array when nothing is selected", () => {
    const far: Point[] = [
      { x: 0.9, y: 0.9 },
      { x: 1.0, y: 0.9 },
      { x: 1.0, y: 1.0 },
    ];
    expect(polygonsInRect([far], { x: 0, y: 0, width: 0.1, height: 0.1 })).toEqual([]);
  });
});

describe("distanceToSegment", () => {
  it("measures the perpendicular distance to the segment interior", () => {
    // Segment along the x-axis; point directly above its middle.
    expect(distanceToSegment({ x: 0.5, y: 0.3 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(
      0.3,
      10,
    );
  });

  it("clamps to the nearest endpoint when the projection falls off the segment", () => {
    // Point is to the left of the segment start → distance to the start vertex.
    expect(distanceToSegment({ x: -0.4, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(
      0.4,
      10,
    );
  });

  it("handles a zero-length segment as point-to-point distance", () => {
    expect(distanceToSegment({ x: 0.3, y: 0.4 }, { x: 0, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(
      0.5,
      10,
    );
  });
});
