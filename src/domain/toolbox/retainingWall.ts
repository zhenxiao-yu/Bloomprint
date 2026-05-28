/**
 * Retaining wall estimator — block courses + count, cap row, and the base + drainage gravel a
 * wall actually needs (the part people forget). Framework-free, ranged, US + Canada. Inputs are
 * ft/m for the wall; block face/height are in/cm. Not a one-multiply: courses, per-course count,
 * waste, and two gravel volumes.
 */
import { z } from "zod";

import { LenUnit, round1, round2, CUFT_PER_CUYD } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

export const GRAVEL_TONS_PER_CUYD = 1.4;
const WASTE_PCT = 8;
/** Base trench: a leveling pad of compacted gravel under the wall. */
const BASE_WIDTH_IN = 12;
const BASE_DEPTH_IN = 6;
/** Drainage gravel backfilled behind the wall, ~12 in wide. */
const DRAIN_WIDTH_IN = 12;

export const RetainingWallInput = z.object({
  unit: LenUnit.default("ft"),
  length: z.number().positive().optional(),
  height: z.number().positive().optional(),
  /** Block face length and height, inches (ft unit) or cm (m unit). */
  blockFace: z.number().positive().default(12),
  blockHeight: z.number().positive().default(6),
  capRow: z.boolean().default(true),
});
export type RetainingWallInput = z.infer<typeof RetainingWallInput>;

export interface RetainingWallResult {
  courses: number;
  perCourse: number;
  blocks: number;
  blocksWithWaste: number;
  capBlocks: number;
  baseGravelCuYd: number;
  drainGravelCuYd: number;
  gravelTons: number;
}

export function computeRetainingWall(raw: z.input<typeof RetainingWallInput>): RetainingWallResult | null {
  const input = RetainingWallInput.parse(raw);
  if (!input.length || !input.height) return null;

  const toFt = (n: number) => (input.unit === "m" ? n * 3.28084 : n);
  const inToFt = (n: number) => (input.unit === "m" ? n / 30.48 : n / 12); // block dims: cm or in → ft
  const lengthFt = toFt(input.length);
  const heightFt = toFt(input.height);
  const faceFt = inToFt(input.blockFace);
  const blockHFt = inToFt(input.blockHeight);
  if (faceFt <= 0 || blockHFt <= 0) return null;

  const courses = Math.max(1, Math.ceil(heightFt / blockHFt));
  const perCourse = Math.max(1, Math.ceil(lengthFt / faceFt));
  const blocks = courses * perCourse;
  const blocksWithWaste = Math.ceil(blocks * (1 + WASTE_PCT / 100));
  const capBlocks = input.capRow ? perCourse : 0;

  const baseCuFt = lengthFt * (BASE_WIDTH_IN / 12) * (BASE_DEPTH_IN / 12);
  const drainCuFt = lengthFt * (DRAIN_WIDTH_IN / 12) * heightFt;
  const baseGravelCuYd = round2(baseCuFt / CUFT_PER_CUYD);
  const drainGravelCuYd = round2(drainCuFt / CUFT_PER_CUYD);

  return {
    courses,
    perCourse,
    blocks,
    blocksWithWaste,
    capBlocks,
    baseGravelCuYd,
    drainGravelCuYd,
    gravelTons: round1((baseGravelCuYd + drainGravelCuYd) * GRAVEL_TONS_PER_CUYD),
  };
}
