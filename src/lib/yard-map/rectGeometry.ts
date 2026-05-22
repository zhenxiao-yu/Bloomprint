/**
 * Pure geometry helpers for the Yard Map builder.
 *
 * The canvas draws axis-aligned rectangles, but the shared zoneModel stores
 * zones as polygons of normalized (0..1) points. These helpers convert between
 * the two and between pixel and normalized space, with no DOM/konva dependency
 * so they can be unit-tested in plain Vitest.
 */
import type { Point } from "./zoneModel";

/** An axis-aligned rectangle in normalized (0..1) coordinates. */
export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Convert a pixel coordinate into a normalized (0..1) point on a stage. */
export function pxToNormalized(
  px: number,
  py: number,
  stageWidth: number,
  stageHeight: number,
): Point {
  if (stageWidth <= 0 || stageHeight <= 0) return { x: 0, y: 0 };
  return { x: clamp01(px / stageWidth), y: clamp01(py / stageHeight) };
}

/** Convert a normalized (0..1) point back into pixels on a stage. */
export function normalizedToPx(
  point: Point,
  stageWidth: number,
  stageHeight: number,
): { x: number; y: number } {
  return { x: point.x * stageWidth, y: point.y * stageHeight };
}

/**
 * Build a normalized rect from two drag corners (in normalized space),
 * regardless of drag direction. Always returns a non-negative width/height.
 */
export function rectFromCorners(a: Point, b: Point): NormalizedRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

/**
 * Convert a normalized rect into 4 polygon points (clockwise from top-left),
 * compatible with zoneModel's `points` / `polygonAreaNormalized`.
 */
export function rectToPolygon(rect: NormalizedRect): Point[] {
  return [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
}

/**
 * Recover a bounding rect from a list of polygon points (the inverse of
 * rectToPolygon for axis-aligned rects, and a sane fallback for any polygon).
 * Returns null if there are no points.
 */
export function polygonToRect(points: Point[]): NormalizedRect | null {
  if (points.length === 0) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    x: minX,
    y: minY,
    width: Math.max(...xs) - minX,
    height: Math.max(...ys) - minY,
  };
}

/** Pixel length of a two-point line in normalized space, given the stage size. */
export function normalizedLineLengthPx(
  a: Point,
  b: Point,
  stageWidth: number,
  stageHeight: number,
): number {
  const dx = (a.x - b.x) * stageWidth;
  const dy = (a.y - b.y) * stageHeight;
  return Math.hypot(dx, dy);
}
