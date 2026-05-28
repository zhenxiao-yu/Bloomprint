/**
 * Edging Calculator — linear edging/border pieces around a bed perimeter (rectangle or circle).
 * Framework-free, ranged (exact → with buffer for cuts/overlap).
 */
import { z } from "zod";

import { ShapeInput, perimeterFtFromShape, type ShapeDims } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

/** Common rigid/coiled edging comes in ~8 ft sections; overridable. */
export const DEFAULT_EDGING_PIECE_FT = 8;
export const DEFAULT_EDGING_EXTRA_PCT = 10;

export const EdgingInput = z.object({
  ...ShapeInput,
  pieceFt: z.number().positive().default(DEFAULT_EDGING_PIECE_FT),
  extraPct: z.number().min(0).max(100).default(DEFAULT_EDGING_EXTRA_PCT),
});
export type EdgingInput = z.infer<typeof EdgingInput>;

export interface EdgingResult {
  perimeterFt: number;
  pieces: number;
  piecesWithExtra: number;
  range: { low: number; high: number };
  pieceFt: number;
  extraPct: number;
}

export function computeEdging(raw: z.input<typeof EdgingInput>): EdgingResult | null {
  const input = EdgingInput.parse(raw);
  const perimeterFt = perimeterFtFromShape(input as ShapeDims);
  if (perimeterFt === null) return null;
  const pieces = Math.max(1, Math.ceil(perimeterFt / input.pieceFt));
  const piecesWithExtra = Math.max(
    pieces,
    Math.ceil((perimeterFt * (1 + input.extraPct / 100)) / input.pieceFt),
  );
  return {
    perimeterFt,
    pieces,
    piecesWithExtra,
    range: { low: pieces, high: piecesWithExtra },
    pieceFt: input.pieceFt,
    extraPct: input.extraPct,
  };
}
