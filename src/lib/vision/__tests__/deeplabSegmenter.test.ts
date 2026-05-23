import { describe, expect, it } from "vitest";
import { labelGridToDraftZones } from "@/lib/vision/deeplabSegmenter";
import { polygonAreaNormalized } from "@/lib/yard-map/zoneModel";

/**
 * Self-contained ADE20K-style labels: only the indices we exercise need to be
 * real strings. We pin known names at known indices so the test never loads the
 * deeplab package (which needs TF.js + a model). The mapping itself
 * (label → zone type) is owned and tested by segmentation.ts.
 */
const SKY = 3;
const GRASS = 10; // → "lawn"
const ROAD = 7; //  → "driveway"
const FENCE = 33; // → "fence"

const LABELS: string[] = [];
LABELS[SKY] = "sky"; //   ade20kLabelToZoneType → null (ignored)
LABELS[GRASS] = "grass"; // → lawn
LABELS[ROAD] = "road, route"; // → driveway
LABELS[FENCE] = "fence"; // → fence

/** Build an h×w grid where every cell holds the same class index. */
function filled(w: number, h: number, cls: number): number[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => cls));
}

describe("labelGridToDraftZones", () => {
  it("turns a top-grass / bottom-road grid into lawn + driveway drafts", () => {
    // 20×20: top half grass, bottom half road.
    const w = 20;
    const h = 20;
    const grid = filled(w, h, GRASS);
    for (let y = h / 2; y < h; y++) {
      for (let x = 0; x < w; x++) grid[y][x] = ROAD;
    }

    const zones = labelGridToDraftZones(grid, LABELS);
    const types = zones.map((z) => z.type);
    expect(types).toContain("lawn");
    expect(types).toContain("driveway");

    // Every emitted zone is an honest low-confidence proposal with a real
    // normalized polygon and a human label.
    for (const z of zones) {
      expect(z.confidence).toBe("low");
      expect(z.points.length).toBeGreaterThanOrEqual(3);
      for (const p of z.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
      expect(polygonAreaNormalized(z.points)).toBeGreaterThan(0);
    }

    // The lawn occupies roughly the top half; its label is carried through.
    const lawn = zones.find((z) => z.type === "lawn");
    expect(lawn?.label).toBe("grass");
    expect(polygonAreaNormalized(lawn!.points)).toBeCloseTo(0.5, 1);
  });

  it("returns [] for an all-sky grid (no mappable yard class)", () => {
    expect(labelGridToDraftZones(filled(16, 16, SKY), LABELS)).toEqual([]);
  });

  it("returns [] for an empty grid", () => {
    expect(labelGridToDraftZones([], LABELS)).toEqual([]);
  });

  it("returns [] for a ragged grid", () => {
    const ragged: number[][] = [
      [GRASS, GRASS, GRASS],
      [GRASS, GRASS], // short row → misaligned, must bail to []
      [GRASS, GRASS, GRASS],
    ];
    expect(labelGridToDraftZones(ragged, LABELS)).toEqual([]);
  });

  it("honors the maxZones cap, keeping the largest regions", () => {
    // Three horizontal bands of distinct mappable classes: a thick grass band
    // (largest), then road, then a thin fence band (smallest).
    const w = 30;
    const h = 30;
    const grid = filled(w, h, GRASS); // rows 0..17 grass (largest)
    for (let y = 18; y < 27; y++) for (let x = 0; x < w; x++) grid[y][x] = ROAD; // rows 18..26
    for (let y = 27; y < h; y++) for (let x = 0; x < w; x++) grid[y][x] = FENCE; // rows 27..29 (smallest)

    const all = labelGridToDraftZones(grid, LABELS);
    expect(all.length).toBeGreaterThanOrEqual(3);

    const capped = labelGridToDraftZones(grid, LABELS, { maxZones: 2 });
    expect(capped).toHaveLength(2);
    // Cap keeps the two largest: grass (lawn) and road (driveway), drops fence.
    expect(capped.map((z) => z.type)).toEqual(["lawn", "driveway"]);
  });
});
