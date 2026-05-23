import { describe, it, expect } from "vitest";
import { parseCommand } from "@/lib/command/parseCommand";

describe("parseCommand", () => {
  it("maps a multi-intent English phrase to refinements in canonical order", () => {
    const { matched, unmatched } = parseCommand("cheaper but still premium");
    expect(matched).toEqual(["cheaper", "premium-look"]);
    expect(unmatched).toBe(false);
  });

  it("matches privacy language", () => {
    expect(parseCommand("I want more privacy from neighbors").matched).toContain("more-privacy");
  });

  it("matches dog/kid safety", () => {
    expect(parseCommand("make it safer for dogs").matched).toContain("dog-safe");
  });

  it("matches Simplified Chinese", () => {
    expect(parseCommand("更便宜一点").matched).toContain("cheaper");
    expect(parseCommand("对狗更安全").matched).toContain("dog-safe");
    expect(parseCommand("更省水").matched).toContain("less-watering");
  });

  it("dedupes and preserves canonical order", () => {
    const { matched } = parseCommand("cheaper cheaper, less watering, budget");
    expect(matched).toEqual(["cheaper", "less-watering"]);
  });

  it("flags input that maps to nothing as unmatched", () => {
    const { matched, unmatched } = parseCommand("teleport my house to Hawaii");
    expect(matched).toEqual([]);
    expect(unmatched).toBe(true);
  });

  it("treats empty input as neither matched nor unmatched", () => {
    expect(parseCommand("   ")).toEqual({ matched: [], unmatched: false });
  });
});
