/**
 * Mulch Calculator — deterministic, framework-free landscaping math.
 *
 * Part of the Landscape Toolbox: quick, honest quantity estimates that work with NO AI,
 * NO live data, and NO network. Outputs a RANGE (exact coverage → recommended with buffer)
 * rather than fake precision, lists every assumption, and warns when a depth would harm plants.
 *
 * Reuses the audited bag constant from the Yard Map material estimator
 * ({@link MULCH_BAG_CU_FT}) so the toolbox and the plan agree on what "a bag" means.
 */
import { z } from "zod";

const SQFT_PER_SQM = 10.7639;
const IN_PER_CM = 1 / 2.54;

/**
 * Standard bagged-mulch volume in cubic feet. Mirrors `MULCH_BAG_CU_FT` in
 * src/lib/yard-map/measurement.ts so the toolbox and the plan agree on what "a bag" means
 * (kept local to keep the domain layer free of app/lib dependencies).
 */
export const DEFAULT_MULCH_BAG_CU_FT = 2;
/** Sensible default over-purchase buffer (settling, spillage, uneven beds). */
export const DEFAULT_EXTRA_PCT = 10;
/**
 * Mulch deeper than this risks suffocating roots and rotting stems/crowns. 2–3 in is the
 * horticultural sweet spot; we warn beyond it rather than silently quoting more bags.
 */
export const MAX_SAFE_MULCH_DEPTH_IN = 3;

export const TOOLBOX_DISCLAIMER =
  "Estimate only. Measure your bed and confirm quantities before buying.";

export const MulchShape = z.enum(["rectangle", "circle", "area"]);
export type MulchShape = z.infer<typeof MulchShape>;

export const MulchUnit = z.enum(["ft", "m"]);
export type MulchUnit = z.infer<typeof MulchUnit>;

/**
 * Inputs. Linear dimensions are in `unit` (ft or m); `area` is in unit² (sq ft or sq m).
 * `depth` is in INCHES when unit="ft" and CENTIMETERS when unit="m" — how people actually
 * think about mulch depth in each system.
 */
export const MulchInput = z.object({
  shape: MulchShape.default("rectangle"),
  unit: MulchUnit.default("ft"),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  radius: z.number().positive().optional(),
  area: z.number().positive().optional(),
  depth: z.number().positive(),
  bagSizeCuFt: z.number().positive().default(DEFAULT_MULCH_BAG_CU_FT),
  extraPct: z.number().min(0).max(100).default(DEFAULT_EXTRA_PCT),
});
export type MulchInput = z.infer<typeof MulchInput>;

export interface MulchResult {
  /** Bed area in square feet (canonical internal unit). */
  areaSqft: number;
  /** Depth normalized to inches (for the too-deep check + display). */
  depthInches: number;
  /** Loose volume of mulch needed, cubic feet. */
  volumeCuFt: number;
  /** Bags to cover the area at the chosen depth (no buffer). */
  bags: number;
  /** Recommended bags including the extra buffer. */
  bagsWithExtra: number;
  /** Honest low–high bag range (exact coverage → with buffer). */
  range: { low: number; high: number };
  recommendedExtraPct: number;
  bagSizeCuFt: number;
  /** True when depth exceeds {@link MAX_SAFE_MULCH_DEPTH_IN} — UI shows a localized caution. */
  depthTooDeep: boolean;
  /** English warning/assumption sentences for non-UI consumers + tests; the UI localizes from the structured fields. */
  warnings: string[];
  assumptions: string[];
}

/** Bed area in square feet for the chosen shape, or null when inputs are incomplete. */
export function mulchAreaSqft(input: Pick<MulchInput, "shape" | "unit" | "length" | "width" | "radius" | "area">): number | null {
  const toSqft = (areaInUnit: number) => (input.unit === "m" ? areaInUnit * SQFT_PER_SQM : areaInUnit);
  let areaInUnit: number | null = null;
  if (input.shape === "rectangle") {
    if (input.length && input.width) areaInUnit = input.length * input.width;
  } else if (input.shape === "circle") {
    if (input.radius) areaInUnit = Math.PI * input.radius * input.radius;
  } else if (input.shape === "area") {
    if (input.area) areaInUnit = input.area;
  }
  if (areaInUnit === null || !Number.isFinite(areaInUnit) || areaInUnit <= 0) return null;
  return round1(toSqft(areaInUnit));
}

/**
 * Compute a mulch estimate. Pure + deterministic. Returns null only when the shape's
 * required dimensions are missing (caller shows an empty/prompt state).
 */
export function computeMulch(raw: z.input<typeof MulchInput>): MulchResult | null {
  const input = MulchInput.parse(raw);
  const areaSqft = mulchAreaSqft(input);
  if (areaSqft === null) return null;

  const depthInches = input.unit === "m" ? round2(input.depth * IN_PER_CM) : input.depth;
  const depthFt = depthInches / 12;
  const volumeCuFt = round2(areaSqft * depthFt);

  const bags = Math.max(1, Math.ceil(volumeCuFt / input.bagSizeCuFt));
  const bagsWithExtra = Math.max(
    bags,
    Math.ceil((volumeCuFt * (1 + input.extraPct / 100)) / input.bagSizeCuFt),
  );

  const warnings: string[] = [];
  if (depthInches > MAX_SAFE_MULCH_DEPTH_IN) {
    warnings.push(
      `A ${formatInches(depthInches)} layer is deeper than the recommended 2–3 in. Too much mulch can suffocate roots and rot stems — keep it 2–3 in and pull it back a few inches from trunks and crowns.`,
    );
  }

  const assumptions: string[] = [
    `One bag = ${input.bagSizeCuFt} cu ft of mulch.`,
    `Depth: ${formatInches(depthInches)} across the whole bed (volume = area × depth).`,
    `Includes a ${input.extraPct}% buffer for settling and uneven coverage.`,
    TOOLBOX_DISCLAIMER,
  ];

  return {
    areaSqft,
    depthInches,
    volumeCuFt,
    bags,
    bagsWithExtra,
    range: { low: bags, high: bagsWithExtra },
    recommendedExtraPct: input.extraPct,
    bagSizeCuFt: input.bagSizeCuFt,
    depthTooDeep: depthInches > MAX_SAFE_MULCH_DEPTH_IN,
    warnings,
    assumptions,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function formatInches(inches: number): string {
  return `${Math.round(inches * 10) / 10} in`;
}
