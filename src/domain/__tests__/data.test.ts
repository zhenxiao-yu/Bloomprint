import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  EquipmentItem,
  MaterialItem,
  PlantRecord,
  RegionPreset,
  ToolItem,
} from "@/domain/models";
import { EQUIPMENT, MATERIALS, PLANTS, REGIONS, TOOLS } from "@/domain/data";

describe("Core Library seed data conforms to its schemas", () => {
  it("plants validate and meet the catalog floor (>=25)", () => {
    expect(() => z.array(PlantRecord).parse(PLANTS)).not.toThrow();
    expect(PLANTS.length).toBeGreaterThanOrEqual(25);
  });

  it("materials validate (>=12)", () => {
    expect(() => z.array(MaterialItem).parse(MATERIALS)).not.toThrow();
    expect(MATERIALS.length).toBeGreaterThanOrEqual(12);
  });

  it("tools validate (>=8)", () => {
    expect(() => z.array(ToolItem).parse(TOOLS)).not.toThrow();
    expect(TOOLS.length).toBeGreaterThanOrEqual(8);
  });

  it("equipment validate (>=5)", () => {
    expect(() => z.array(EquipmentItem).parse(EQUIPMENT)).not.toThrow();
    expect(EQUIPMENT.length).toBeGreaterThanOrEqual(5);
  });

  it("regions validate (>=6)", () => {
    expect(() => z.array(RegionPreset).parse(REGIONS)).not.toThrow();
    expect(REGIONS.length).toBeGreaterThanOrEqual(6);
  });

  it("plant ids and price ranges are sane", () => {
    const ids = new Set(PLANTS.map((p) => p.id));
    expect(ids.size).toBe(PLANTS.length); // unique
    for (const p of PLANTS) {
      expect(p.unitPrice.min).toBeLessThanOrEqual(p.unitPrice.max);
      expect(p.hardinessMin).toBeLessThanOrEqual(p.hardinessMax);
    }
  });
});
