/**
 * Fertilizer / NPK rate — how much of a given product to apply to hit a target nitrogen rate.
 * The non-obvious bit people get wrong: product weight depends on the bag's N%, and high rates
 * must be split into multiple applications. Framework-free, ranged-by-rounding, US + Canada
 * (lb + kg). Based on the standard "lb N per 1,000 sq ft" turf/bed convention.
 */
import { z } from "zod";

import { ShapeInput, areaSqftFromShape, round1, round2, type ShapeDims } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

export const LB_PER_KG = 0.453592;
/** Apply no more than this much soluble N at once; above it, split into multiple feeds. */
export const MAX_N_PER_APP = 1;

export const FertilizerInput = z.object({
  ...ShapeInput,
  /** Target nitrogen, lb N per 1,000 sq ft (1.0 is a common single-feed turf rate). */
  targetNPer1000: z.number().positive().max(5).default(1),
  /** First number on the bag (N-P-K), as a percent. */
  nitrogenPct: z.number().positive().max(60),
});
export type FertilizerInput = z.infer<typeof FertilizerInput>;

export interface FertilizerResult {
  areaSqft: number;
  nitrogenLb: number;
  productLb: number;
  productKg: number;
  /** Suggested number of applications to keep each ≤ MAX_N_PER_APP. */
  applications: number;
  productPerAppLb: number;
}

export function computeFertilizer(raw: z.input<typeof FertilizerInput>): FertilizerResult | null {
  const input = FertilizerInput.parse(raw);
  const areaSqft = areaSqftFromShape(input as ShapeDims);
  if (areaSqft === null) return null;

  const nitrogenLb = round2(input.targetNPer1000 * (areaSqft / 1000));
  const productLb = round1(nitrogenLb / (input.nitrogenPct / 100));
  const applications = Math.max(1, Math.ceil(input.targetNPer1000 / MAX_N_PER_APP));

  return {
    areaSqft,
    nitrogenLb,
    productLb,
    productKg: round1(productLb * LB_PER_KG),
    applications,
    productPerAppLb: round1(productLb / applications),
  };
}
