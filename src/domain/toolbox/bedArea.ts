/**
 * Bed Area Calculator — the measurement primitive many other tools build on. Reports area in
 * both sq ft and sq m, plus perimeter where the shape defines one. Framework-free.
 */
import { z } from "zod";

import {
  ShapeInput,
  areaSqftFromShape,
  perimeterFtFromShape,
  round1,
  SQFT_PER_SQM,
  type ShapeDims,
} from "./_geometry";

export const BedAreaInput = z.object({ ...ShapeInput });
export type BedAreaInput = z.infer<typeof BedAreaInput>;

export interface BedAreaResult {
  areaSqft: number;
  areaSqm: number;
  /** Null for the known-area shape (no defined perimeter). */
  perimeterFt: number | null;
}

export function computeBedArea(raw: z.input<typeof BedAreaInput>): BedAreaResult | null {
  const input = BedAreaInput.parse(raw);
  const areaSqft = areaSqftFromShape(input as ShapeDims);
  if (areaSqft === null) return null;
  return {
    areaSqft,
    areaSqm: round1(areaSqft / SQFT_PER_SQM),
    perimeterFt: perimeterFtFromShape(input as ShapeDims),
  };
}
