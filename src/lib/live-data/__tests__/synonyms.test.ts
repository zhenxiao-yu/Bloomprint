import { describe, expect, it } from "vitest";
import { getPlantSynonymTerms, getUsdaSynonyms } from "@/lib/live-data/synonyms";

describe("usda synonyms accessor", () => {
  it("resolves a known plant to its USDA accepted name + synonyms", () => {
    // Red-twig dogwood: USDA accepted Cornus sericea, with Cornus stolonifera a textbook synonym.
    const entry = getUsdaSynonyms("red-twig-dogwood");
    expect(entry?.accepted).toBe("Cornus sericea");
    expect(entry?.synonyms).toContain("Cornus stolonifera");
  });

  it("returns synonym terms as a plain array (or empty, never throws)", () => {
    expect(Array.isArray(getPlantSynonymTerms("red-twig-dogwood"))).toBe(true);
    expect(getPlantSynonymTerms("does-not-exist")).toEqual([]);
  });

  it("never includes the accepted name among its own synonyms", () => {
    const entry = getUsdaSynonyms("black-eyed-susan");
    if (entry) expect(entry.synonyms).not.toContain(entry.accepted);
  });

  it("keeps each synonym list bounded (search-term widening, not a dump)", () => {
    expect(getPlantSynonymTerms("red-twig-dogwood").length).toBeLessThanOrEqual(8);
  });
});
