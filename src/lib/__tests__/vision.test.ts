import { describe, expect, it } from "vitest";
import { VisionSuggestion } from "@/lib/visionProvider";

describe("VisionSuggestion schema", () => {
  it("accepts a valid suggestion and defaults observations", () => {
    const parsed = VisionSuggestion.parse({ sun: "part-sun" });
    expect(parsed.sun).toBe("part-sun");
    expect(parsed.observations).toEqual([]);
  });

  it("keeps provided observations and a note", () => {
    const parsed = VisionSuggestion.parse({
      sun: "shade",
      observations: ["mature tree shades the afternoon", "existing lawn"],
      note: "Estimate only — confirm on site.",
    });
    expect(parsed.observations).toHaveLength(2);
    expect(parsed.note).toContain("Estimate");
  });

  it("rejects an invalid sun value", () => {
    expect(VisionSuggestion.safeParse({ sun: "sometimes" }).success).toBe(false);
  });

  it("caps observations at 5", () => {
    const many = Array.from({ length: 6 }, (_, i) => `obs ${i}`);
    expect(VisionSuggestion.safeParse({ sun: "unknown", observations: many }).success).toBe(false);
  });
});
