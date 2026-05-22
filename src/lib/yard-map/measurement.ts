/**
 * Measurement calibration — honest, manual real-world estimates from a photo.
 *
 * We do NOT pretend a photo carries metric truth. The user draws a line over a
 * feature of known real-world length (a fence panel, a paver, a tape measure)
 * and tells us how long it really is. From that single ratio we estimate areas
 * and rough material counts. Every result is an ESTIMATE the user must confirm
 * before buying or digging (MEASUREMENT_DISCLAIMER below). These estimates are
 * never silently fed into the deterministic plan.
 */
import { z } from "zod";

/** Always show this with any derived measurement. */
export const MEASUREMENT_DISCLAIMER =
  "Estimated measurement. Confirm before buying materials or digging.";

/**
 * Manual calibration: a reference line of `pixelLength` pixels that the user
 * says is `realLength` units long in the real world.
 */
export const Calibration = z.object({
  pixelLength: z.number().positive(),
  realLength: z.number().positive(),
  unit: z.enum(["ft", "m"]),
});
export type Calibration = z.infer<typeof Calibration>;

/**
 * Real-world units per image pixel.
 * unitsPerPixel = realLength / pixelLength  (e.g. 6 ft over 300 px → 0.02 ft/px).
 */
export function unitsPerPixel(cal: Calibration): number {
  return cal.realLength / cal.pixelLength;
}

/**
 * Convert a normalized polygon area into a real-world area estimate.
 *
 * Math / assumptions:
 *  - `areaNorm` is in normalized² units (see polygonAreaNormalized): it is the
 *    polygon area as a fraction of the full image, with each axis in [0,1].
 *  - Multiplying by (imagePixelW * imagePixelH) recovers the area in pixels².
 *  - upp = unitsPerPixel(cal) converts one linear pixel to real units, so
 *    upp² converts one pixel² to real units². Hence:
 *        realArea = areaNorm * imagePixelW * imagePixelH * upp²
 *  - Assumes the ground is roughly flat and the camera looks roughly straight
 *    down / level (no perspective correction). This is why it is an ESTIMATE.
 *
 * Returns area in the calibration's unit squared (ft² if unit is "ft", m² if "m").
 */
export function scaleNormalizedArea(
  areaNorm: number,
  imagePixelW: number,
  imagePixelH: number,
  cal: Calibration,
): number {
  const upp = unitsPerPixel(cal);
  const areaPixels = areaNorm * imagePixelW * imagePixelH;
  return areaPixels * upp * upp;
}

// ---------------------------------------------------------------------------
// Material estimate constants (named + documented so they are auditable).
// ---------------------------------------------------------------------------

/** A standard bagged-mulch volume in cubic feet. */
export const MULCH_BAG_CU_FT = 2;
/**
 * Coverage of one 2 cu ft mulch bag at a 2-inch (≈0.167 ft) depth:
 *   2 cu ft / (2/12 ft) = 12 ft². Rounded constant kept explicit.
 */
export const MULCH_BAG_COVERAGE_SQFT = 12;
/** Default plant center-to-center spacing in feet (1 plant per 1.5 ft × 1.5 ft). */
export const DEFAULT_PLANT_SPACING_FT = 1.5;

export interface MaterialEstimateOptions {
  /** Center-to-center plant spacing in feet (default DEFAULT_PLANT_SPACING_FT). */
  plantSpacingFt?: number;
  /**
   * Bed perimeter in feet, if known (e.g. summed from real edge lengths). When
   * provided, edging length equals the perimeter; otherwise edging is omitted.
   */
  perimeterFt?: number;
}

export interface MaterialEstimate {
  areaSqft: number;
  mulchBags: number;
  edgingFt: number | null;
  plantCount: number;
  assumptions: string[];
}

/**
 * Rough material quantities for a bed of `areaSqft` square feet.
 *
 * - mulchBags  = ceil(area / MULCH_BAG_COVERAGE_SQFT)  (2 cu ft bag ≈ 12 ft² @ 2in)
 * - edgingFt   = perimeterFt if provided, else null (we never guess perimeter)
 * - plantCount = floor(area / spacing²)  with spacing default 1.5 ft
 *
 * All numbers are deterministic and rounded conservatively. Returns an
 * `assumptions` array describing every constant used so the UI can be honest.
 */
export function estimateMaterialsFromArea(
  areaSqft: number,
  opts: MaterialEstimateOptions = {},
): MaterialEstimate {
  const area = Math.max(0, areaSqft);
  const spacing = opts.plantSpacingFt ?? DEFAULT_PLANT_SPACING_FT;

  const mulchBags = area > 0 ? Math.ceil(area / MULCH_BAG_COVERAGE_SQFT) : 0;
  const plantCount = spacing > 0 ? Math.floor(area / (spacing * spacing)) : 0;
  const edgingFt =
    typeof opts.perimeterFt === "number" ? Math.max(0, opts.perimeterFt) : null;

  const assumptions: string[] = [
    MEASUREMENT_DISCLAIMER,
    `Mulch: one ${MULCH_BAG_CU_FT} cu ft bag covers ~${MULCH_BAG_COVERAGE_SQFT} sq ft at 2 in depth.`,
    `Plant spacing: ${spacing} ft on center (~1 plant per ${(spacing * spacing).toFixed(2)} sq ft).`,
  ];
  if (edgingFt === null) {
    assumptions.push("Edging length unknown — provide a perimeter to estimate it.");
  } else {
    assumptions.push("Edging length assumes the marked perimeter is the bed border.");
  }

  return { areaSqft: area, mulchBags, edgingFt, plantCount, assumptions };
}
