/**
 * Plant Spacing → count. Given a bed area and a center-to-center spacing, how many plants fit?
 * Square grid uses spacing²; triangular (offset rows) packs ~15.5% more (×0.866 area per plant).
 * Framework-free.
 */
import { z } from "zod";

import { ShapeInput, areaSqftFromShape, round1, round2, type ShapeDims } from "./_geometry";
import { TOOLBOX_DISCLAIMER } from "./mulch";

export { TOOLBOX_DISCLAIMER };

export const SpacingPattern = z.enum(["square", "triangular"]);
export type SpacingPattern = z.infer<typeof SpacingPattern>;

export const SpacingInput = z.object({
  ...ShapeInput,
  spacing: z.number().positive(), // inches when unit="ft", cm when unit="m"
  pattern: SpacingPattern.default("square"),
});
export type SpacingInput = z.infer<typeof SpacingInput>;

export interface SpacingResult {
  areaSqft: number;
  spacingInches: number;
  /** Square feet each plant occupies for the chosen pattern. */
  perPlantSqft: number;
  plants: number;
  pattern: SpacingPattern;
}

export function computeSpacing(raw: z.input<typeof SpacingInput>): SpacingResult | null {
  const input = SpacingInput.parse(raw);
  const areaSqft = areaSqftFromShape(input as ShapeDims);
  if (areaSqft === null) return null;

  const spacingInches = input.unit === "m" ? round2(input.spacing / 2.54) : input.spacing;
  const spacingFt = spacingInches / 12;
  const perPlantSqft = spacingFt * spacingFt * (input.pattern === "triangular" ? 0.866 : 1);
  if (perPlantSqft <= 0) return null;
  const plants = Math.max(0, Math.floor(areaSqft / perPlantSqft));

  return {
    areaSqft,
    spacingInches: round1(spacingInches),
    perPlantSqft: round2(perPlantSqft),
    plants,
    pattern: input.pattern,
  };
}
