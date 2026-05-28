/**
 * Fence estimator — posts, sections, rails, pickets, and concrete from a run length, post
 * spacing, and gate count. Framework-free, US + Canada (ft/m). Multi-factor: end/gate posts,
 * rounding, and the bits people undercount (rails + concrete).
 */
import { z } from "zod";

import { LenUnit, round1 } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

export const FenceStyle = z.enum(["panel", "picket"]);
export type FenceStyle = z.infer<typeof FenceStyle>;

/** ~2 bags of concrete set a typical 4×4 post. */
const BAGS_PER_POST = 2;

export const FenceInput = z.object({
  unit: LenUnit.default("ft"),
  length: z.number().positive().optional(),
  postSpacing: z.number().positive().default(8), // ft or m
  gates: z.number().int().min(0).max(20).default(0),
  style: FenceStyle.default("panel"),
  railsPerSection: z.number().int().min(2).max(4).default(3),
  /** Picket width incl. gap, inches (ft) or cm (m). */
  picketWidth: z.number().positive().default(5.5),
});
export type FenceInput = z.infer<typeof FenceInput>;

export interface FenceResult {
  lengthFt: number;
  sections: number;
  posts: number;
  rails: number;
  panels: number | null;
  pickets: number | null;
  concreteBags: number;
}

export function computeFence(raw: z.input<typeof FenceInput>): FenceResult | null {
  const input = FenceInput.parse(raw);
  if (!input.length) return null;

  const toFt = (n: number) => (input.unit === "m" ? n * 3.28084 : n);
  const lengthFt = toFt(input.length);
  const spacingFt = toFt(input.postSpacing);
  if (spacingFt <= 0) return null;

  const sections = Math.max(1, Math.ceil(lengthFt / spacingFt));
  // Line posts + 1 end post, plus an extra post per gate.
  const posts = sections + 1 + input.gates;
  const rails = sections * input.railsPerSection;
  const concreteBags = posts * BAGS_PER_POST;

  let panels: number | null = null;
  let pickets: number | null = null;
  if (input.style === "panel") {
    panels = sections;
  } else {
    const picketFt = input.unit === "m" ? input.picketWidth / 30.48 : input.picketWidth / 12;
    pickets = picketFt > 0 ? Math.ceil(lengthFt / picketFt) : null;
  }

  return {
    lengthFt: round1(lengthFt),
    sections,
    posts,
    rails,
    panels,
    pickets,
    concreteBags,
  };
}
