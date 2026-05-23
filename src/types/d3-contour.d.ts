/**
 * Minimal ambient types for `d3-contour` (the package ships no .d.ts and there
 * is no @types/d3-contour). We only use the threshold-based `contours()`
 * generator to extract region polygons from a binary mask grid, so we declare
 * just that surface.
 *
 * Reference: https://github.com/d3/d3-contour
 */
declare module "d3-contour" {
  /** A GeoJSON-style MultiPolygon emitted for one threshold band. */
  export interface ContourMultiPolygon {
    type: "MultiPolygon";
    value: number;
    /** [polygon][ring][point][x|y] — rings are closed, hole rings wind opposite. */
    coordinates: number[][][][];
  }

  export interface Contours {
    (values: ArrayLike<number>): ContourMultiPolygon[];
    size(size: [number, number]): Contours;
    size(): [number, number];
    thresholds(thresholds: number[] | number): Contours;
    smooth(smooth: boolean): Contours;
  }

  export function contours(): Contours;
}
