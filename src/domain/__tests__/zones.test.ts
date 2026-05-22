import { describe, expect, it } from "vitest";
import { lookupZone } from "@/domain/data/zones";
import { generateDeterministicPlan } from "@/domain/plan";
import { resolveSite } from "@/domain/rules";
import { FIXTURES } from "@/domain";

describe("lookupZone", () => {
  it("resolves a US ZIP to a metro zone", () => {
    const z = lookupZone("60601");
    expect(z?.label).toContain("Chicago");
    expect(z?.precision).toBe("good");
  });

  it("resolves a Canadian postal code by FSA letter", () => {
    const z = lookupZone("M5V 2T6");
    expect(z?.label).toContain("Toronto");
    expect(z?.precision).toBe("medium");
  });

  it("returns null for uncovered or invalid input", () => {
    expect(lookupZone("00000")).toBeNull();
    expect(lookupZone("zzz")).toBeNull();
    expect(lookupZone("")).toBeNull();
  });
});

describe("resolveSite applies a recognized zone", () => {
  it("overrides hardiness and records a zoneMatch + assumption", () => {
    const site = resolveSite({ ...FIXTURES["low-maintenance-backyard"], locationQuery: "60601" });
    expect(site.zoneMatch?.label).toContain("Chicago");
    expect(site.hardinessMin).toBe(6);
    expect(site.assumptions.some((a) => a.includes("Hardiness"))).toBe(true);
  });

  it("notes the miss but still produces a site for an uncovered code", () => {
    const site = resolveSite({ ...FIXTURES["low-maintenance-backyard"], locationQuery: "00000" });
    expect(site.zoneMatch).toBeNull();
    expect(site.assumptions.some((a) => a.toLowerCase().includes("zone library"))).toBe(true);
  });
});

describe("a recognized location raises plan confidence", () => {
  it("scores higher with a ZIP than without", () => {
    const without = generateDeterministicPlan(FIXTURES["low-maintenance-backyard"]);
    const withZip = generateDeterministicPlan({
      ...FIXTURES["low-maintenance-backyard"],
      locationQuery: "60601",
    });
    expect(withZip.scores.confidence).toBeGreaterThan(without.scores.confidence);
    expect(withZip.confidenceReasons.some((r) => r.text.includes("Chicago"))).toBe(true);
  });
});
