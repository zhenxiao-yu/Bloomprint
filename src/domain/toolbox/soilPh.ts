/**
 * Soil pH amendment — how much lime (to raise) or elemental sulfur (to lower) a bed needs to
 * reach a target pH, scaled by soil texture (clay buffers more than sand). Framework-free,
 * ranged, US + Canada (result shown in lb AND kg). Rates are standard extension-service figures
 * per 1,000 sq ft per 1.0 pH unit — labeled as estimates; a soil test is the real answer.
 */
import { z } from "zod";

import { ShapeInput, areaSqftFromShape, round1, type ShapeDims } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

export const SoilTexture = z.enum(["sandy", "loam", "clay"]);
export type SoilTexture = z.infer<typeof SoilTexture>;

export const LB_PER_KG = 0.453592;
/** lb per 1,000 sq ft to move pH by 1.0 unit (ground limestone to raise / elemental S to lower). */
const LIME_LB_PER_1000_PER_UNIT: Record<SoilTexture, number> = { sandy: 25, loam: 40, clay: 50 };
const SULFUR_LB_PER_1000_PER_UNIT: Record<SoilTexture, number> = { sandy: 10, loam: 15, clay: 20 };
/** Don't try to move pH more than this in one season. */
export const MAX_SAFE_PH_SHIFT = 1.5;

export const SoilPhInput = z.object({
  ...ShapeInput,
  currentPh: z.number().min(3).max(10),
  targetPh: z.number().min(3).max(10),
  texture: SoilTexture.default("loam"),
});
export type SoilPhInput = z.infer<typeof SoilPhInput>;

export interface SoilPhResult {
  areaSqft: number;
  delta: number; // target - current (rounded)
  /** "lime" to raise, "sulfur" to lower, "none" when already at target. */
  amendment: "lime" | "sulfur" | "none";
  lbLow: number;
  lbHigh: number;
  kgLow: number;
  kgHigh: number;
  shiftTooBig: boolean;
}

export function computeSoilPh(raw: z.input<typeof SoilPhInput>): SoilPhResult | null {
  const input = SoilPhInput.parse(raw);
  const areaSqft = areaSqftFromShape(input as ShapeDims);
  if (areaSqft === null) return null;

  const delta = round1(input.targetPh - input.currentPh);
  if (Math.abs(delta) < 0.1) {
    return {
      areaSqft,
      delta: 0,
      amendment: "none",
      lbLow: 0,
      lbHigh: 0,
      kgLow: 0,
      kgHigh: 0,
      shiftTooBig: false,
    };
  }

  const raising = delta > 0;
  const ratePer1000 = raising
    ? LIME_LB_PER_1000_PER_UNIT[input.texture]
    : SULFUR_LB_PER_1000_PER_UNIT[input.texture];
  const mid = Math.abs(delta) * ratePer1000 * (areaSqft / 1000);
  // ±20% band — real soils vary; this is a planning estimate, not a soil test.
  const lbLow = round1(mid * 0.9);
  const lbHigh = round1(mid * 1.15);

  return {
    areaSqft,
    delta,
    amendment: raising ? "lime" : "sulfur",
    lbLow,
    lbHigh,
    kgLow: round1(lbLow * LB_PER_KG),
    kgHigh: round1(lbHigh * LB_PER_KG),
    shiftTooBig: Math.abs(delta) > MAX_SAFE_PH_SHIFT,
  };
}
