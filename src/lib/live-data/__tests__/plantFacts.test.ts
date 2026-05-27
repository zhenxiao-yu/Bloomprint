import { describe, expect, it } from "vitest";
import { getPlantFacts } from "@/lib/live-data/plantFacts";

describe("getPlantFacts — no free live care provider", () => {
  it("returns null: care facts come from the Core Library, never a third-party free API", async () => {
    expect(await getPlantFacts("Lavandula angustifolia", "English lavender")).toBeNull();
    expect(await getPlantFacts("Thuja occidentalis", "Cedar")).toBeNull();
  });
});
