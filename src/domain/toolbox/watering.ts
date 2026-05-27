/**
 * Watering run-time. How long to run a sprinkler to apply a target depth of water, given the
 * sprinkler's precipitation (output) rate. minutes = target ÷ rate × 60. Framework-free.
 */
import { z } from "zod";

import { round1 } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

/** A common lawn target is ~1 inch of water per session. */
export const DEFAULT_TARGET_IN = 1;

export const WateringInput = z.object({
  /** Sprinkler precipitation/output rate, inches per hour (from a catch-cup test or spec). */
  outputInPerHr: z.number().positive(),
  /** Target water depth per session, inches. */
  targetIn: z.number().positive().default(DEFAULT_TARGET_IN),
});
export type WateringInput = z.infer<typeof WateringInput>;

export interface WateringResult {
  minutes: number;
  targetIn: number;
  outputInPerHr: number;
}

export function computeWatering(raw: z.input<typeof WateringInput>): WateringResult | null {
  const input = WateringInput.parse(raw);
  const minutes = round1((input.targetIn / input.outputInPerHr) * 60);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return { minutes, targetIn: input.targetIn, outputInPerHr: input.outputInPerHr };
}
