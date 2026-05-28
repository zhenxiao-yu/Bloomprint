/**
 * Raised-bed soil blend — total fill volume for a bed, split into a topsoil / compost / aeration
 * recipe, with bag counts and bulk cubic yards per component. The value over a plain volume calc
 * is the recipe split + per-component bag math. Framework-free, US + Canada (cu ft + cu yd).
 */
import { z } from "zod";

import { LenUnit, round2, CUFT_PER_CUYD } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

export const DEFAULT_BAG_CU_FT = 1.5;

export const RaisedBedInput = z.object({
  unit: LenUnit.default("ft"),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  /** Fill depth: inches when unit="ft", cm when unit="m". */
  height: z.number().positive(),
  topsoilPct: z.number().min(0).max(100).default(60),
  compostPct: z.number().min(0).max(100).default(30),
  aerationPct: z.number().min(0).max(100).default(10),
  bagSizeCuFt: z.number().positive().default(DEFAULT_BAG_CU_FT),
});
export type RaisedBedInput = z.infer<typeof RaisedBedInput>;

export interface BlendPart {
  cuFt: number;
  cuYd: number;
  bags: number;
}
export interface RaisedBedResult {
  totalCuFt: number;
  totalCuYd: number;
  topsoil: BlendPart;
  compost: BlendPart;
  aeration: BlendPart;
  /** True when the three percentages don't add to 100 (UI nudges the user). */
  pctOff: boolean;
}

function part(totalCuFt: number, pct: number, bagSizeCuFt: number): BlendPart {
  const cuFt = round2((totalCuFt * pct) / 100);
  return {
    cuFt,
    cuYd: round2(cuFt / CUFT_PER_CUYD),
    bags: cuFt > 0 ? Math.max(1, Math.ceil(cuFt / bagSizeCuFt)) : 0,
  };
}

export function computeRaisedBed(raw: z.input<typeof RaisedBedInput>): RaisedBedResult | null {
  const input = RaisedBedInput.parse(raw);
  if (!input.length || !input.width) return null;

  const toFt = (n: number) => (input.unit === "m" ? n * 3.28084 : n);
  const heightFt = input.unit === "m" ? input.height / 100 : input.height / 12;
  const totalCuFt = round2(toFt(input.length) * toFt(input.width) * heightFt);
  if (totalCuFt <= 0) return null;

  return {
    totalCuFt,
    totalCuYd: round2(totalCuFt / CUFT_PER_CUYD),
    topsoil: part(totalCuFt, input.topsoilPct, input.bagSizeCuFt),
    compost: part(totalCuFt, input.compostPct, input.bagSizeCuFt),
    aeration: part(totalCuFt, input.aerationPct, input.bagSizeCuFt),
    pctOff: Math.round(input.topsoilPct + input.compostPct + input.aerationPct) !== 100,
  };
}
