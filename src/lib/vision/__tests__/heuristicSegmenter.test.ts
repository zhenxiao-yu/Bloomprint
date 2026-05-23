import { describe, expect, it } from "vitest";
import { heuristicDraftZones, heuristicSegmenter } from "@/lib/vision/heuristicSegmenter";
import { polygonAreaNormalized } from "@/lib/yard-map/zoneModel";

describe("heuristicDraftZones", () => {
  it("returns draft zones with valid normalized polygons", () => {
    const zones = heuristicDraftZones("general");
    expect(zones.length).toBeGreaterThan(0);
    for (const z of zones) {
      expect(z.points).toHaveLength(4);
      expect(z.confidence).toBe("low");
      for (const p of z.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(1);
      }
      expect(polygonAreaNormalized(z.points)).toBeGreaterThan(0);
    }
  });

  it("varies the template by goal", () => {
    const privacy = heuristicDraftZones("privacy");
    const curb = heuristicDraftZones("curb-appeal");
    // Privacy leads with a fence line; curb-appeal does not.
    expect(privacy.some((z) => z.type === "fence")).toBe(true);
    expect(curb.some((z) => z.type === "fence")).toBe(false);
    // Curb-appeal proposes flanking beds (more than one planting bed).
    expect(curb.filter((z) => z.type === "planting_bed").length).toBeGreaterThan(1);
  });

  it("falls back to the base template for an unknown goal", () => {
    expect(heuristicDraftZones("???")).toEqual(heuristicDraftZones(undefined));
  });
});

describe("heuristicSegmenter", () => {
  it("always resolves to zones without touching the image", async () => {
    const zones = await heuristicSegmenter.segment({ goal: "pollinator" });
    expect(zones.some((z) => z.type === "planting_bed")).toBe(true);
  });
});
