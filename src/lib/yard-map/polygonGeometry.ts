/**
 * Pure polygon-editing geometry for the CAD-like Yard Map editor.
 *
 * Like rectGeometry, these helpers operate purely on normalized (0..1) points
 * with no DOM/konva dependency, so the editor's vertex/edge operations can be
 * unit-tested in plain Vitest. They power direct-manipulation editing: drag a
 * whole zone, drag a vertex, split an edge to add a vertex, delete a vertex,
 * snap to a grid or to right angles, and marquee-select zones.
 *
 * Everything here is deterministic and side-effect free, and all functions
 * return fresh arrays/objects (never mutate their inputs).
 */
import type { Point } from "./zoneModel";
import type { NormalizedRect } from "./rectGeometry";

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Ray-casting (even-odd rule) point-in-polygon test.
 *
 * Casts a ray to the right of `p` and counts edge crossings; an odd count means
 * inside. Points exactly on the boundary may report either way — callers that
 * need a tolerance should test against `distanceToSegment` instead. Fewer than
 * 3 points cannot enclose an area → always false.
 */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const intersects =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Area-weighted centroid of a polygon (shoelace formula).
 *
 * For a degenerate polygon (fewer than 3 points, or zero enclosed area such as
 * a collinear/duplicate set) this falls back to the plain average of the
 * points. An empty polygon returns the origin {x:0, y:0}.
 */
export function polygonCentroid(poly: Point[]): Point {
  if (poly.length === 0) return { x: 0, y: 0 };
  const average = (): Point => {
    let sx = 0;
    let sy = 0;
    for (const pt of poly) {
      sx += pt.x;
      sy += pt.y;
    }
    return { x: sx / poly.length, y: sy / poly.length };
  };
  if (poly.length < 3) return average();

  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = a.x * b.y - b.x * a.y;
    signedArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (signedArea === 0) return average();
  const factor = 1 / (3 * signedArea);
  return { x: cx * factor, y: cy * factor };
}

/** Translate every vertex by (dx, dy). Pure; does NOT clamp to [0,1]. */
export function movePolygon(poly: Point[], dx: number, dy: number): Point[] {
  return poly.map((pt) => ({ x: pt.x + dx, y: pt.y + dy }));
}

/**
 * Replace the vertex at `index` with `to` (clamped to [0,1]). An out-of-range
 * index returns an unchanged shallow copy of the polygon.
 */
export function moveVertex(poly: Point[], index: number, to: Point): Point[] {
  const next = poly.map((pt) => ({ ...pt }));
  if (index < 0 || index >= next.length) return next;
  next[index] = { x: clamp01(to.x), y: clamp01(to.y) };
  return next;
}

/**
 * Insert a new vertex by splitting whichever edge is closest to `at`.
 *
 * Walks every edge (i → i+1, wrapping the last back to the first), finds the
 * one with the smallest distance to `at`, and inserts `at` (clamped to [0,1])
 * just after that edge's start vertex. The result is a new array with exactly
 * one extra point. With fewer than 2 points there is no edge to split, so the
 * clamped point is simply appended.
 */
export function insertVertexOnNearestEdge(poly: Point[], at: Point): Point[] {
  const point = { x: clamp01(at.x), y: clamp01(at.y) };
  const next = poly.map((pt) => ({ ...pt }));
  if (next.length < 2) {
    next.push(point);
    return next;
  }

  let bestEdge = 0;
  let bestDist = Infinity;
  for (let i = 0; i < next.length; i++) {
    const a = next[i];
    const b = next[(i + 1) % next.length];
    const dist = distanceToSegment(point, a, b);
    if (dist < bestDist) {
      bestDist = dist;
      bestEdge = i;
    }
  }
  next.splice(bestEdge + 1, 0, point);
  return next;
}

/**
 * Remove the vertex at `index`. No-op (returns a copy) when the index is out of
 * range, or when removal would drop the polygon below 3 points (the minimum to
 * still enclose an area).
 */
export function removeVertex(poly: Point[], index: number): Point[] {
  const next = poly.map((pt) => ({ ...pt }));
  if (index < 0 || index >= next.length) return next;
  if (next.length <= 3) return next;
  next.splice(index, 1);
  return next;
}

/**
 * Snap a point to a grid of the given step (normalized units), e.g. step 0.05.
 * A non-positive step is a no-op and the point is returned unchanged (copied).
 */
export function snapToGrid(p: Point, step: number): Point {
  if (!(step > 0)) return { x: p.x, y: p.y };
  return { x: Math.round(p.x / step) * step, y: Math.round(p.y / step) * step };
}

/**
 * Orthogonalize a polygon: for each edge that is within `toleranceDeg` of
 * horizontal or vertical, snap that edge's endpoints to share a coordinate
 * (equal y for near-horizontal, equal x for near-vertical), making the edge
 * exactly axis-aligned. The snap target is the midpoint of the two endpoints,
 * which keeps the operation stable and direction-independent.
 *
 * Edges are visited in order; the last edge wraps back to the first. Vertices
 * are kept within [0,1]. `toleranceDeg` defaults to 12°.
 */
export function snapRightAngles(poly: Point[], toleranceDeg = 12): Point[] {
  const next = poly.map((pt) => ({ ...pt }));
  if (next.length < 2) return next;

  const tolRad = (toleranceDeg * Math.PI) / 180;
  for (let i = 0; i < next.length; i++) {
    const ai = i;
    const bi = (i + 1) % next.length;
    const a = next[ai];
    const b = next[bi];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) continue;

    // Angle of the edge measured from the positive x-axis, folded into [0, 90].
    const angle = Math.abs(Math.atan2(dy, dx));
    const fromHorizontal = Math.min(angle, Math.PI - angle);
    const fromVertical = Math.abs(angle - Math.PI / 2);

    if (fromHorizontal <= tolRad && fromHorizontal <= fromVertical) {
      // Near-horizontal: share a y coordinate (the midpoint y).
      const y = clamp01((a.y + b.y) / 2);
      next[ai] = { x: a.x, y };
      next[bi] = { x: b.x, y };
    } else if (fromVertical <= tolRad) {
      // Near-vertical: share an x coordinate (the midpoint x).
      const x = clamp01((a.x + b.x) / 2);
      next[ai] = { x, y: a.y };
      next[bi] = { x, y: b.y };
    }
  }
  return next;
}

/**
 * Index of the vertex within `maxDist` (euclidean, normalized) of `to`, nearest
 * first. Returns null when no vertex is within range (or the polygon is empty).
 */
export function nearestVertexIndex(
  poly: Point[],
  to: Point,
  maxDist: number,
): number | null {
  let bestIndex: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const d = Math.hypot(poly[i].x - to.x, poly[i].y - to.y);
    if (d <= maxDist && d < bestDist) {
      bestDist = d;
      bestIndex = i;
    }
  }
  return bestIndex;
}

/**
 * For a marquee/lasso select: the indices of polygons whose centroid lies
 * inside `rect`. The rect is treated as inclusive on all edges so a centroid
 * exactly on a boundary still counts as selected.
 */
export function polygonsInRect(polys: Point[][], rect: NormalizedRect): number[] {
  const minX = rect.x;
  const minY = rect.y;
  const maxX = rect.x + rect.width;
  const maxY = rect.y + rect.height;
  const selected: number[] = [];
  for (let i = 0; i < polys.length; i++) {
    const c = polygonCentroid(polys[i]);
    if (c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY) {
      selected.push(i);
    }
  }
  return selected;
}

/**
 * Chaikin corner-cutting: round off a closed polygon's corners to approximate a
 * curved (organic) bed, while staying a plain point polygon (so area math and
 * the data model are unchanged). Each iteration replaces every vertex with two
 * points at 1/4 and 3/4 along each edge, roughly doubling the point count and
 * halving each corner. 1–2 iterations reads as a smooth bed; more gets rounder.
 *
 * Returns a copy unchanged for fewer than 3 points or non-positive iterations.
 */
export function chaikinSmooth(poly: Point[], iterations = 1): Point[] {
  if (poly.length < 3 || iterations <= 0) return poly.map((pt) => ({ ...pt }));
  let pts = poly.map((pt) => ({ ...pt }));
  for (let it = 0; it < iterations; it++) {
    const next: Point[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      next.push({ x: clamp01(a.x * 0.75 + b.x * 0.25), y: clamp01(a.y * 0.75 + b.y * 0.25) });
      next.push({ x: clamp01(a.x * 0.25 + b.x * 0.75), y: clamp01(a.y * 0.25 + b.y * 0.75) });
    }
    pts = next;
  }
  return pts;
}

/**
 * Shortest distance from point `p` to the line segment `ab`.
 *
 * Projects `p` onto the segment, clamping the projection parameter to [0,1] so
 * the nearest point stays on the segment (not the infinite line). A zero-length
 * segment degenerates to the distance from `p` to that single point.
 */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.min(1, Math.max(0, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}
