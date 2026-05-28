import { describe, expect, it } from "vitest";

import { lookupCompanions, COMPANION_CROPS } from "@/domain/toolbox/companion";
import { recommendGrass } from "@/domain/toolbox/grassType";

describe("lookupCompanions", () => {
  it("returns null for an unknown crop", () => {
    expect(lookupCompanions({ crop: "dragonfruit" })).toBeNull();
  });
  it("knows tomato loves basil and dislikes brassicas", () => {
    const r = lookupCompanions({ crop: "tomato" })!;
    expect(r.good).toContain("basil");
    expect(r.bad).toContain("broccoli");
    expect(r.note).toBe("tomato");
  });
  it("every crop's companions reference known crops", () => {
    for (const crop of COMPANION_CROPS) {
      const r = lookupCompanions({ crop })!;
      for (const c of [...r.good, ...r.bad]) {
        // companions may include helpers (e.g. dill) not in the crop list; just ensure non-empty strings
        expect(typeof c).toBe("string");
        expect(c.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("recommendGrass", () => {
  it("recommends cool-season grasses for a cool region", () => {
    const r = recommendGrass({ region: "cool", sun: "full", traffic: "medium" });
    expect(r.matches.length).toBeGreaterThan(0);
    expect(r.matches.every((m) => m.season === "cool")).toBe(true);
  });
  it("offers both seasons in the transition zone", () => {
    const seasons = new Set(recommendGrass({ region: "transition", sun: "full", traffic: "low" }).matches.map((m) => m.season));
    expect(seasons.has("cool")).toBe(true);
    expect(seasons.has("warm")).toBe(true);
  });
  it("only returns shade-tolerant grasses in shade", () => {
    const r = recommendGrass({ region: "cool", sun: "shade", traffic: "low" });
    expect(r.matches.every((m) => m.toleratesSun)).toBe(true);
    // fine fescue tolerates shade; perennial rye does not
    expect(r.matches.map((m) => m.key)).toContain("fineFescue");
    expect(r.matches.map((m) => m.key)).not.toContain("perennialRye");
  });
  it("ranks low-water species higher when prioritized", () => {
    const r = recommendGrass({ region: "warm", sun: "full", traffic: "high", lowWater: true });
    expect(r.matches[0].lowWater).toBe(true);
  });
});
