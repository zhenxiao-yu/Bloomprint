/**
 * Tuning — the effect of refinement chips (Draft 1 → iterate, docs/DECISIONS.md D4).
 *
 * A refinement never changes facts; it re-runs the deterministic engine with different
 * preferences/filters. Same inputs + same adjustments always produce the same plan.
 *
 * This is Bloomprint's constrained conversational system — the deliberate replacement for a
 * freeform chatbot. Chips map to honest, deterministic levers only (we omit claims we can't back,
 * e.g. "repels mosquitoes").
 */
import type { RefinementAdjustment, StyleFamily, WaterNeed } from "@/domain/models";

export interface Tuning {
  /** Exclude plants toxic to pets/kids entirely. */
  dogSafe: boolean;
  /** Drop plants needing more than this much water. */
  maxWater: WaterNeed | null;
  /** Bias selection toward flowering perennials / color. */
  flowerBias: boolean;
  /** Prefer cheaper plants/materials and trim quantities. */
  cheaper: boolean;
  /** Fewer species, lower-maintenance picks, lighter labor. */
  easier: boolean;
  /** Require salt-tolerant plants only. */
  saltSafe: boolean;
  /** Require shade/part-sun tolerant plants only. */
  shadeOnly: boolean;
  /** Boost evergreens, grasses, and winter-stem plants. */
  winterInterest: boolean;
  /** Avoid shearing-heavy hedging; prefer self-shaping, low-trim plants. */
  lowTrim: boolean;
  /** Prefer higher-end materials (steel edging, stone, lighting) for a premium finish. */
  premium: boolean;
  /** Emphasize a tall green screen even when privacy isn't the primary goal. */
  privacyBoost: boolean;
  /** Skip decorative stone in favor of mulch (cheaper + easier to haul). */
  noStone: boolean;
  /** Force a specific style family (e.g. "More modern"). */
  forceStyle: StyleFamily | null;
}

export const NO_TUNING: Tuning = {
  dogSafe: false,
  maxWater: null,
  flowerBias: false,
  cheaper: false,
  easier: false,
  saltSafe: false,
  shadeOnly: false,
  winterInterest: false,
  lowTrim: false,
  premium: false,
  privacyBoost: false,
  noStone: false,
  forceStyle: null,
};

const WATER_RANK: Record<WaterNeed, number> = { low: 0, medium: 1, high: 2 };

export function waterAtMost(need: WaterNeed, max: WaterNeed): boolean {
  return WATER_RANK[need] <= WATER_RANK[max];
}

export function deriveTuning(adjustments: RefinementAdjustment[] = []): Tuning {
  const t: Tuning = { ...NO_TUNING };
  for (const a of adjustments) {
    switch (a) {
      case "dog-safe":
        t.dogSafe = true;
        break;
      case "less-watering":
        t.maxWater = "medium";
        break;
      case "more-flowers":
      case "more-colorful":
        t.flowerBias = true;
        break;
      case "cheaper":
        t.cheaper = true;
        break;
      case "easier":
        t.easier = true;
        break;
      case "salt-safe":
        t.saltSafe = true;
        break;
      case "more-shade":
        t.shadeOnly = true;
        break;
      case "better-winter":
        t.winterInterest = true;
        break;
      case "less-trimming":
        t.lowTrim = true;
        break;
      case "premium-look":
        t.premium = true;
        break;
      case "more-privacy":
        t.privacyBoost = true;
        break;
      case "stone-to-mulch":
        t.noStone = true;
        break;
      case "more-modern":
        t.forceStyle = "modern-minimal";
        break;
      case "wildlife-friendly":
        t.forceStyle = "layered-pollinator";
        t.flowerBias = true;
        break;
      case "better-resale":
        t.forceStyle = "modern-minimal";
        t.premium = true;
        break;
    }
  }
  return t;
}
