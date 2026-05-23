import { describe, expect, it } from "vitest";
import { guidesForPhase, GUIDE_CATALOG } from "@/domain/guides";
import { GuideTopic, type MaterialCategory, type YardIntake } from "@/domain/models";

const intake: YardIntake = {
  regionId: "gta-ontario", goal: "privacy", effortLevel: "moderate",
  hasPhoto: false, sun: "unknown", soil: "clay", drainage: "unknown",
};

const PHASE_TITLES = [
  "Mark & clear the bed",
  "Improve the soil",
  "Set out & plant (back to front)",
  "Edge & mulch",
  "Lighting & finishing",
];

describe("guide catalog + phase mapping", () => {
  it("every catalog entry is an honest search/authoritative link with https", () => {
    for (const topic of GuideTopic.options) {
      const g = GUIDE_CATALOG[topic];
      expect(g.topic).toBe(topic);
      expect(["search", "authoritative"]).toContain(g.kind);
      expect(g.url.startsWith("https://")).toBe(true);
    }
  });

  it("every install phase maps to at least one guide", () => {
    const cats = new Set<MaterialCategory>(["mulch", "soil", "edging", "stone"]);
    for (const title of PHASE_TITLES) {
      const guides = guidesForPhase(title, cats, intake);
      expect(guides.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("uses clay-soil guidance and privacy guidance from context", () => {
    const soil = guidesForPhase("Improve the soil", new Set<MaterialCategory>(), intake);
    expect(soil.some((g) => g.topic === "amend_clay_soil")).toBe(true);
    const plant = guidesForPhase("Set out & plant (back to front)", new Set<MaterialCategory>(), intake);
    expect(plant.some((g) => g.topic === "improve_privacy_strip")).toBe(true);
  });
});
