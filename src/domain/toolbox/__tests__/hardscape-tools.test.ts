import { describe, expect, it } from "vitest";

import { computeRetainingWall } from "@/domain/toolbox/retainingWall";
import { computeFence } from "@/domain/toolbox/fence";
import { computeFrenchDrain } from "@/domain/toolbox/frenchDrain";

describe("computeRetainingWall", () => {
  it("returns null when incomplete", () => {
    expect(computeRetainingWall({ unit: "ft", length: 20 })).toBeNull();
  });
  it("counts courses, per-course blocks, cap, and gravel", () => {
    // 20 ft long × 2 ft high, 12 in face × 6 in block → 4 courses × 20 = 80 blocks
    const r = computeRetainingWall({ unit: "ft", length: 20, height: 2, blockFace: 12, blockHeight: 6 })!;
    expect(r.courses).toBe(4);
    expect(r.perCourse).toBe(20);
    expect(r.blocks).toBe(80);
    expect(r.blocksWithWaste).toBeGreaterThan(80);
    expect(r.capBlocks).toBe(20);
    expect(r.gravelTons).toBeGreaterThan(0);
  });
  it("drops the cap row when disabled", () => {
    expect(computeRetainingWall({ unit: "ft", length: 10, height: 2, capRow: false })!.capBlocks).toBe(0);
  });
});

describe("computeFence", () => {
  it("returns null when incomplete", () => {
    expect(computeFence({ unit: "ft", postSpacing: 8 })).toBeNull();
  });
  it("computes posts, sections, rails, panels and concrete", () => {
    // 80 ft @ 8 ft spacing → 10 sections, 11 posts (+0 gates), 30 rails, 10 panels, 22 bags
    const r = computeFence({ unit: "ft", length: 80, postSpacing: 8, style: "panel", railsPerSection: 3 })!;
    expect(r.sections).toBe(10);
    expect(r.posts).toBe(11);
    expect(r.rails).toBe(30);
    expect(r.panels).toBe(10);
    expect(r.pickets).toBeNull();
    expect(r.concreteBags).toBe(22);
  });
  it("adds a post per gate and counts pickets in picket mode", () => {
    const r = computeFence({ unit: "ft", length: 40, postSpacing: 8, gates: 1, style: "picket", picketWidth: 6 })!;
    expect(r.posts).toBe(40 / 8 + 1 + 1); // 7
    expect(r.pickets).toBe(Math.ceil(40 / (6 / 12))); // 80
    expect(r.panels).toBeNull();
  });
});

describe("computeFrenchDrain", () => {
  it("returns null when incomplete", () => {
    expect(computeFrenchDrain({ unit: "ft", width: 12, depth: 18 })).toBeNull();
  });
  it("computes gravel (minus pipe), pipe length, fabric, and a min slope drop", () => {
    const r = computeFrenchDrain({ unit: "ft", length: 40, width: 12, depth: 18, pipeDiameter: 4 })!;
    expect(r.gravelCuYd).toBeGreaterThan(0);
    expect(r.gravelTons).toBeGreaterThan(0);
    expect(r.pipeFt).toBeGreaterThan(40); // includes waste
    expect(r.fabricSqft).toBeGreaterThan(0);
    expect(r.minDropFt).toBeCloseTo(0.4, 1); // 1% of 40 ft
  });
});
