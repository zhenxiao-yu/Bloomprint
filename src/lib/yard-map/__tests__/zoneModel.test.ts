import { describe, expect, it } from "vitest";
import {
  YardMap,
  createZone,
  parseYardMap,
  polygonAreaNormalized,
} from "@/lib/yard-map/zoneModel";

describe("polygonAreaNormalized", () => {
  it("computes the unit square area as 1", () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(polygonAreaNormalized(square)).toBeCloseTo(1, 10);
  });

  it("computes a right triangle area as 0.5", () => {
    const tri = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];
    expect(polygonAreaNormalized(tri)).toBeCloseTo(0.5, 10);
  });

  it("is independent of winding order", () => {
    const cw = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ];
    expect(polygonAreaNormalized(cw)).toBeCloseTo(1, 10);
  });

  it("returns 0 for degenerate polygons (<3 points)", () => {
    expect(polygonAreaNormalized([])).toBe(0);
    expect(polygonAreaNormalized([{ x: 0, y: 0 }])).toBe(0);
    expect(polygonAreaNormalized([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
});

describe("createZone", () => {
  it("applies sensible defaults and a generated id", () => {
    const zone = createZone();
    expect(zone.id).toMatch(/^zone_/);
    expect(zone.type).toBe("planting_bed");
    expect(zone.points).toEqual([]);
    expect(zone.notes).toEqual([]);
    expect(zone.confidence).toBe("medium");
  });

  it("honors provided fields and generates unique ids", () => {
    const a = createZone({ type: "lawn", confidence: "high", notes: ["mow weekly"] });
    const b = createZone({ type: "lawn" });
    expect(a.type).toBe("lawn");
    expect(a.confidence).toBe("high");
    expect(a.notes).toEqual(["mow weekly"]);
    expect(a.id).not.toBe(b.id);
  });
});

describe("YardMap schema + parseYardMap", () => {
  it("rejects an invalid zone type", () => {
    const bad = {
      id: "m1",
      zones: [{ id: "z1", type: "patio", points: [], notes: [], confidence: "high" }],
    };
    expect(YardMap.safeParse(bad).success).toBe(false);
  });

  it("parseYardMap returns null on bad input and the map on good input", () => {
    expect(parseYardMap({ nope: true })).toBeNull();
    const good = {
      id: "m1",
      imageRef: "img.jpg",
      zones: [createZone({ type: "planting_bed" })],
    };
    const parsed = parseYardMap(good);
    expect(parsed).not.toBeNull();
    expect(parsed?.zones).toHaveLength(1);
  });
});
