import { describe, expect, it } from "vitest";
import { samMaskToDraftZone } from "@/lib/vision/samSegmenter";
import { polygonAreaNormalized } from "@/lib/yard-map/zoneModel";

/** Build a w×h mask with a solid block of 1s in [x0,x1)×[y0,y1). */
function blockMask(w: number, h: number, x0: number, y0: number, x1: number, y1: number): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1;
  return m;
}

describe("samMaskToDraftZone", () => {
  it("turns a central blob into one low-confidence draft zone", () => {
    const w = 40;
    const h = 40;
    const mask = blockMask(w, h, 10, 10, 30, 30); // centered 20×20 block
    const zone = samMaskToDraftZone(mask, w, h);
    expect(zone).not.toBeNull();
    expect(zone!.type).toBe("planting_bed");
    expect(zone!.confidence).toBe("low");
    expect(zone!.label).toBe("selection");
    expect(zone!.points.length).toBeGreaterThanOrEqual(3);
    for (const p of zone!.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
    // ~ (20/40)^2 = 0.25 of the frame, give or take contour chamfering.
    expect(polygonAreaNormalized(zone!.points)).toBeGreaterThan(0.1);
  });

  it("respects an explicit zone type/label", () => {
    const mask = blockMask(40, 40, 8, 8, 32, 32);
    const zone = samMaskToDraftZone(mask, 40, 40, { type: "lawn", label: "grass pick" });
    expect(zone!.type).toBe("lawn");
    expect(zone!.label).toBe("grass pick");
  });

  it("returns null for an empty mask or degenerate dimensions", () => {
    expect(samMaskToDraftZone(new Uint8Array(1600), 40, 40)).toBeNull();
    expect(samMaskToDraftZone(new Uint8Array(0), 0, 0)).toBeNull();
    // Buffer too small for the claimed dimensions.
    expect(samMaskToDraftZone(new Uint8Array(10), 40, 40)).toBeNull();
  });

  it("accepts logit-style values (foreground = value > 0)", () => {
    const w = 30;
    const h = 30;
    const mask = new Float32Array(w * h).fill(-5);
    for (let y = 8; y < 22; y++) for (let x = 8; x < 22; x++) mask[y * w + x] = 4.2;
    const zone = samMaskToDraftZone(mask, w, h);
    expect(zone).not.toBeNull();
  });
});
