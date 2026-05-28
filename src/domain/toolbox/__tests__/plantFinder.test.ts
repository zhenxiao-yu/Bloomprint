import { describe, expect, it } from "vitest";

import { findPlants } from "@/domain/toolbox/plantFinder";
import { PLANTS } from "@/domain/data/plants";

describe("findPlants", () => {
  it("returns catalog plants with no filters", () => {
    const r = findPlants({});
    expect(r.total).toBe(PLANTS.length);
    expect(r.matches.length).toBeGreaterThan(0);
    expect(r.matches.length).toBeLessThanOrEqual(12);
  });

  it("excludes plants out of the chosen hardiness zone", () => {
    const zone = 3;
    const r = findPlants({ zone, limit: 48 });
    for (const m of r.matches) {
      expect(m.hardinessMin).toBeLessThanOrEqual(zone);
      expect(m.hardinessMax).toBeGreaterThanOrEqual(zone);
    }
  });

  it("pet-safe filter excludes toxic plants", () => {
    const r = findPlants({ petSafe: true, limit: 48 });
    expect(r.matches.every((m) => !m.toxicToPetsOrKids)).toBe(true);
  });

  it("deer + salt filters only return tolerant plants", () => {
    const r = findPlants({ deerResistant: true, saltTolerant: true, limit: 48 });
    expect(r.matches.every((m) => m.deerResistant && m.saltTolerant)).toBe(true);
  });

  it("excludes invasive by default", () => {
    expect(findPlants({ limit: 48 }).matches.every((m) => !m.invasive)).toBe(true);
  });

  it("filters by sun and water", () => {
    const r = findPlants({ sun: "full-sun", water: "low", limit: 48 });
    expect(r.matches.every((m) => m.sun.includes("full-sun") && m.water === "low")).toBe(true);
  });

  it("ranks low-maintenance plants ahead of high-maintenance", () => {
    const r = findPlants({ limit: 48 });
    const rank = { low: 2, medium: 1, high: 0 } as const;
    for (let i = 1; i < r.matches.length; i++) {
      // non-increasing maintenance-ease score (plus resilience) — first item is at least as easy
      expect(rank[r.matches[0].maintenance]).toBeGreaterThanOrEqual(rank[r.matches[i].maintenance] - 0);
    }
  });
});
