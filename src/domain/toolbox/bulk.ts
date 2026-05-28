/**
 * Bulk material volume — shared math for topsoil, compost, gravel, etc. Area × depth → loose
 * volume, then bags (with buffer) and cubic yards for bulk delivery. Framework-free, ranged,
 * honest. Gravel adds an estimated tonnage band (density varies — labeled as an estimate).
 */
import { z } from "zod";

import {
  ShapeInput,
  areaSqftFromShape,
  round1,
  round2,
  IN_PER_CM,
  CUFT_PER_CUYD,
  type ShapeDims,
} from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

/** Bagged soil/compost is commonly 1–2 cu ft; 1.5 is a safe default. */
export const DEFAULT_BULK_BAG_CU_FT = 1.5;
export const DEFAULT_BULK_EXTRA_PCT = 10;
/** Approx loose density for crushed stone/gravel, US tons per cubic yard (varies by stone). */
export const GRAVEL_TONS_PER_CUYD = 1.4;

export const BulkInput = z.object({
  ...ShapeInput,
  depth: z.number().positive(), // inches when unit="ft", cm when unit="m"
  bagSizeCuFt: z.number().positive().default(DEFAULT_BULK_BAG_CU_FT),
  extraPct: z.number().min(0).max(100).default(DEFAULT_BULK_EXTRA_PCT),
});
export type BulkInput = z.infer<typeof BulkInput>;

export interface BulkResult {
  areaSqft: number;
  depthInches: number;
  volumeCuFt: number;
  volumeCuYd: number;
  bags: number;
  bagsWithExtra: number;
  /** Honest low–high bag range (exact coverage → with buffer). */
  range: { low: number; high: number };
  bagSizeCuFt: number;
  extraPct: number;
  /** Estimated tonnage band for bulk stone (only meaningful for gravel/stone). */
  tons: { low: number; high: number };
}

export function computeBulk(raw: z.input<typeof BulkInput>): BulkResult | null {
  const input = BulkInput.parse(raw);
  const areaSqft = areaSqftFromShape(input as ShapeDims);
  if (areaSqft === null) return null;

  const depthInches = input.unit === "m" ? round2(input.depth * IN_PER_CM) : input.depth;
  const volumeCuFt = round2(areaSqft * (depthInches / 12));
  const volumeCuYd = round2(volumeCuFt / CUFT_PER_CUYD);

  const bags = Math.max(1, Math.ceil(volumeCuFt / input.bagSizeCuFt));
  const bagsWithExtra = Math.max(
    bags,
    Math.ceil((volumeCuFt * (1 + input.extraPct / 100)) / input.bagSizeCuFt),
  );

  const tonsMid = volumeCuYd * GRAVEL_TONS_PER_CUYD;
  return {
    areaSqft,
    depthInches,
    volumeCuFt,
    volumeCuYd,
    bags,
    bagsWithExtra,
    range: { low: bags, high: bagsWithExtra },
    bagSizeCuFt: input.bagSizeCuFt,
    extraPct: input.extraPct,
    tons: { low: round1(tonsMid * 0.9), high: round1(tonsMid * 1.15) },
  };
}
