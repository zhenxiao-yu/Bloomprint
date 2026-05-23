/**
 * Turn a user {@link Measurement} into an area and into RANGED material quantities.
 *
 * Honesty rule (KNOWN_LIMITATIONS): missing/low-confidence measurements widen the range rather
 * than fake precision. This reuses the same coverage idea as estimation/index.ts `bagsFor` (area ÷
 * coverage) — it just adds a confidence-driven spread and a measurement→sqft adapter.
 */
import type { ConfidenceLevel, MaterialCategory, Measurement } from "@/domain/models";

const SQFT_PER_SQM = 10.7639;

/** Convert a measurement to square feet, or `undefined` if it carries no usable size. */
export function measurementToSqft(measurement: Measurement | undefined): number | undefined {
  if (!measurement) return undefined;
  const toSqft = (areaInUnit: number) =>
    measurement.unit === "m" ? areaInUnit * SQFT_PER_SQM : areaInUnit;

  if (measurement.area !== undefined) return round1(toSqft(measurement.area));
  if (measurement.length !== undefined && measurement.width !== undefined) {
    return round1(toSqft(measurement.length * measurement.width));
  }
  return undefined;
}

/** Coverage in sqft per unit (mirrors the material seed defaults used in estimation/index.ts). */
const COVERAGE: Record<MaterialCategory | "edging-linear", number> = {
  mulch: 8,
  stone: 4,
  soil: 12,
  fabric: 100,
  lighting: 8, // fixtures spaced ~8 ft
  edging: 1, // linear ft handled specially
  "edging-linear": 1,
};

/** Confidence → ± spread fraction. Lower confidence = wider, more honest range. */
const SPREAD: Record<ConfidenceLevel, number> = {
  low: 0.4,
  medium: 0.2,
  good: 0.12,
  high: 0.08,
};

export interface QuantityEstimate {
  /** Mid-point quantity (bags, fixtures, or linear ft). */
  quantity: number;
  /** Honest low–high range derived from measurement confidence. */
  range: { low: number; high: number };
  unit: "bag" | "linear-ft" | "fixture";
  confidence: ConfidenceLevel;
}

/**
 * Estimate how much of a material category a measured bed needs, as a range.
 * Returns `null` when the measurement carries no usable size (caller falls back to area rules).
 */
export function estimateMaterialQuantity(
  measurement: Measurement | undefined,
  materialCategory: MaterialCategory,
): QuantityEstimate | null {
  const sqft = measurementToSqft(measurement);
  if (sqft === undefined) return null;
  const confidence = measurement?.confidence ?? "low";
  const spread = SPREAD[confidence];

  if (materialCategory === "edging") {
    // Edging runs roughly along the lawn side of a ~4 ft-deep bed (matches estimation/index.ts).
    const linear = Math.max(8, Math.round(sqft / 4));
    return rangeOf(linear, spread, "linear-ft", confidence);
  }

  if (materialCategory === "lighting") {
    const fixtures = Math.min(8, Math.max(2, Math.round(Math.sqrt(sqft) / 1.5)));
    return rangeOf(fixtures, spread, "fixture", confidence);
  }

  const coverage = COVERAGE[materialCategory] ?? 8;
  const effectiveArea = materialCategory === "stone" ? sqft * 0.15 : sqft;
  const bags = Math.max(1, Math.ceil(effectiveArea / coverage));
  return rangeOf(bags, spread, "bag", confidence);
}

function rangeOf(
  quantity: number,
  spread: number,
  unit: QuantityEstimate["unit"],
  confidence: ConfidenceLevel,
): QuantityEstimate {
  const low = Math.max(1, Math.floor(quantity * (1 - spread)));
  const high = Math.max(low + 1, Math.ceil(quantity * (1 + spread)));
  return { quantity, range: { low, high }, unit, confidence };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
