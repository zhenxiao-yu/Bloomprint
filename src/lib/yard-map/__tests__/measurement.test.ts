import { describe, expect, it } from "vitest";
import {
  MEASUREMENT_DISCLAIMER,
  estimateMaterialsFromArea,
  scaleNormalizedArea,
  unitsPerPixel,
} from "@/lib/yard-map/measurement";

describe("unitsPerPixel", () => {
  it("derives real units per pixel from a calibration line", () => {
    // A 6 ft fence panel measured as 300 px → 0.02 ft/px.
    expect(unitsPerPixel({ pixelLength: 300, realLength: 6, unit: "ft" })).toBeCloseTo(0.02, 10);
  });
});

describe("scaleNormalizedArea", () => {
  it("converts a normalized area to a real-world estimate", () => {
    // Calibration: 0.02 ft/px. A polygon covering 25% of a 1000x800 image.
    // areaPixels = 0.25 * 1000 * 800 = 200000 px²
    // realArea  = 200000 * 0.02² = 200000 * 0.0004 = 80 ft²
    const cal = { pixelLength: 300, realLength: 6, unit: "ft" as const };
    expect(scaleNormalizedArea(0.25, 1000, 800, cal)).toBeCloseTo(80, 6);
  });
});

describe("estimateMaterialsFromArea", () => {
  it("returns sane positive quantities and assumptions for a known area", () => {
    // 48 ft² bed, default 1.5 ft spacing.
    const est = estimateMaterialsFromArea(48);
    expect(est.areaSqft).toBe(48);
    expect(est.mulchBags).toBe(Math.ceil(48 / 12)); // 4 bags
    expect(est.plantCount).toBe(Math.floor(48 / (1.5 * 1.5))); // 21
    expect(est.mulchBags).toBeGreaterThan(0);
    expect(est.plantCount).toBeGreaterThan(0);
    expect(est.assumptions.length).toBeGreaterThan(0);
    expect(est.assumptions).toContain(MEASUREMENT_DISCLAIMER);
    expect(est.edgingFt).toBeNull();
  });

  it("uses a provided perimeter for edging and custom spacing", () => {
    const est = estimateMaterialsFromArea(100, { perimeterFt: 40, plantSpacingFt: 2 });
    expect(est.edgingFt).toBe(40);
    expect(est.plantCount).toBe(Math.floor(100 / 4)); // 25
  });

  it("handles zero / negative area without negative output", () => {
    const est = estimateMaterialsFromArea(-5);
    expect(est.areaSqft).toBe(0);
    expect(est.mulchBags).toBe(0);
    expect(est.plantCount).toBe(0);
  });
});
