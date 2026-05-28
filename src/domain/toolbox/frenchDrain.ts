/**
 * French drain estimator — gravel (volume + tons), perforated pipe, filter fabric, and the
 * minimum slope drop a trench needs to actually drain. Framework-free, US + Canada. Trench
 * length is ft/m; width/depth are in/cm. Not a one-multiply: cross-section volume minus pipe,
 * fabric wrap area, and a slope check people skip.
 */
import { z } from "zod";

import { LenUnit, round1, round2, CUFT_PER_CUYD } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

export const GRAVEL_TONS_PER_CUYD = 1.4;
/** Minimum recommended slope: ~1% (about 1 in per 8 ft). */
export const MIN_SLOPE_PCT = 1;
const PIPE_WASTE_PCT = 10;

export const FrenchDrainInput = z.object({
  unit: LenUnit.default("ft"),
  length: z.number().positive().optional(),
  width: z.number().positive().default(12), // in or cm
  depth: z.number().positive().default(18), // in or cm
  pipeDiameter: z.number().positive().default(4), // in or cm
});
export type FrenchDrainInput = z.infer<typeof FrenchDrainInput>;

export interface FrenchDrainResult {
  lengthFt: number;
  gravelCuYd: number;
  gravelTons: number;
  pipeFt: number;
  fabricSqft: number;
  /** Minimum vertical drop end-to-end for adequate drainage, in feet. */
  minDropFt: number;
}

export function computeFrenchDrain(raw: z.input<typeof FrenchDrainInput>): FrenchDrainResult | null {
  const input = FrenchDrainInput.parse(raw);
  if (!input.length) return null;

  const toFt = (n: number) => (input.unit === "m" ? n * 3.28084 : n);
  const inToFt = (n: number) => (input.unit === "m" ? n / 30.48 : n / 12);
  const lengthFt = toFt(input.length);
  const widthFt = inToFt(input.width);
  const depthFt = inToFt(input.depth);
  const pipeRadiusFt = inToFt(input.pipeDiameter) / 2;
  if (widthFt <= 0 || depthFt <= 0) return null;

  const trenchCuFt = lengthFt * widthFt * depthFt;
  const pipeCuFt = Math.PI * pipeRadiusFt * pipeRadiusFt * lengthFt;
  const gravelCuFt = Math.max(0, trenchCuFt - pipeCuFt);
  const gravelCuYd = round2(gravelCuFt / CUFT_PER_CUYD);

  // Fabric wraps the trench cross-section (bottom + two sides + overlap) along its length.
  const fabricSqft = round1((widthFt + 2 * depthFt + 0.5) * lengthFt);

  return {
    lengthFt: round1(lengthFt),
    gravelCuYd,
    gravelTons: round1(gravelCuYd * GRAVEL_TONS_PER_CUYD),
    pipeFt: round1(lengthFt * (1 + PIPE_WASTE_PCT / 100)),
    fabricSqft,
    minDropFt: round2((lengthFt * MIN_SLOPE_PCT) / 100),
  };
}
