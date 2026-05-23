/**
 * Convert a semantic-segmentation label grid into editable yard zones.
 *
 * An on-device segmenter emits a per-pixel class map (row-major, one integer
 * label per cell). This module isolates the cells of a single class and traces
 * their outline into simplified, normalized (0..1) polygons that the yard-map
 * editor can treat exactly like hand-drawn zones (see zoneModel `Point`).
 *
 * The tracing is delegated to d3-contour's marching-squares generator; the rest
 * (binary mask, normalization, Douglas-Peucker simplification, area filtering)
 * is pure TypeScript with no DOM/konva/Next dependency, so it unit-tests in
 * plain Vitest. Like the rest of yard-map, these polygons are confirmable
 * ESTIMATES, never ground truth for the deterministic plan.
 */
import { contours } from "d3-contour";
import type { Point } from "./zoneModel";
import { polygonAreaNormalized } from "./zoneModel";

export interface MaskToPolygonsOptions {
  /** Drop regions smaller than this fraction of the whole grid. Default 0.01. */
  minAreaFraction?: number;
  /** Return at most this many polygons, largest-area first. Default 3. */
  maxPolygons?: number;
  /** Douglas-Peucker tolerance in NORMALIZED units (0..1). Default 0.01. */
  simplifyTolerance?: number;
}

const DEFAULTS: Required<MaskToPolygonsOptions> = {
  minAreaFraction: 0.01,
  maxPolygons: 3,
  simplifyTolerance: 0.01,
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/**
 * Perpendicular distance from point `p` to the line through `a` and `b`.
 * Falls back to the plain distance to `a` when the segment is degenerate.
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  // |cross product| / |segment length| = distance to the infinite line.
  const cross = Math.abs(dy * (p.x - a.x) - dx * (p.y - a.y));
  return cross / Math.sqrt(lengthSq);
}

/**
 * Douglas-Peucker polyline simplification (recursive), implemented inline so we
 * add no dependency. Keeps the first and last points and any vertex whose
 * perpendicular distance to the current chord exceeds `tolerance`.
 */
function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points.slice();

  let maxDistance = 0;
  let index = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[last]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) {
    return [points[0], points[last]];
  }

  const left = douglasPeucker(points.slice(0, index + 1), tolerance);
  const right = douglasPeucker(points.slice(index), tolerance);
  // `right` repeats the split vertex that ends `left`; drop the duplicate.
  return left.slice(0, -1).concat(right);
}

/**
 * Convert one d3-contour outer ring (grid-space [x, y] pairs) into normalized,
 * de-duplicated polygon points. Marching-squares rings are closed (last point
 * repeats the first); the trailing duplicate is removed so simplification and
 * the shoelace area see a clean open ring.
 */
function ringToNormalizedPoints(
  ring: number[][],
  width: number,
  height: number,
): Point[] {
  const points: Point[] = ring.map(([x, y]) => ({
    x: clamp01(x / width),
    y: clamp01(y / height),
  }));
  if (points.length > 1) {
    const first = points[0];
    const tail = points[points.length - 1];
    if (first.x === tail.x && first.y === tail.y) points.pop();
  }
  return points;
}

/**
 * Extract simplified, normalized (0..1) polygons for all cells equal to
 * `targetLabel` in a ROW-MAJOR label grid of size width×height.
 *
 * Regions smaller than `minAreaFraction` of the grid are dropped, the rest are
 * sorted largest-area first and capped to `maxPolygons`. Returns an empty array
 * for invalid dimensions, an undersized `labels` buffer, no matching cells, or
 * when every traced ring degenerates to fewer than 3 points after simplifying.
 */
export function maskToPolygons(
  labels: ArrayLike<number>,
  width: number,
  height: number,
  targetLabel: number,
  opts: MaskToPolygonsOptions = {},
): Point[][] {
  if (width <= 0 || height <= 0) return [];
  const cellCount = width * height;
  if (labels.length < cellCount) return [];

  const { minAreaFraction, maxPolygons, simplifyTolerance } = {
    ...DEFAULTS,
    ...opts,
  };

  // Build the binary mask: 1 where the cell matches the target class, else 0.
  const binary = new Float64Array(cellCount);
  let matches = 0;
  for (let i = 0; i < cellCount; i++) {
    if (labels[i] === targetLabel) {
      binary[i] = 1;
      matches++;
    }
  }
  if (matches === 0) return [];

  // Trace the single 0.5 band: cells >= 0.5 (i.e. the matched class) are inside.
  const multiPolygons = contours().size([width, height]).thresholds([0.5])(binary);

  const result: { points: Point[]; area: number }[] = [];
  for (const multi of multiPolygons) {
    for (const polygon of multi.coordinates) {
      // Outer ring only (index 0); holes (later indices) are ignored.
      const outer = polygon[0];
      if (!outer || outer.length < 3) continue;

      const normalized = ringToNormalizedPoints(outer, width, height);
      const simplified = douglasPeucker(normalized, simplifyTolerance);
      if (simplified.length < 3) continue; // degenerate after simplify

      const area = polygonAreaNormalized(simplified);
      if (area < minAreaFraction) continue;

      result.push({ points: simplified, area });
    }
  }

  result.sort((a, b) => b.area - a.area);
  return result.slice(0, maxPolygons).map((r) => r.points);
}
