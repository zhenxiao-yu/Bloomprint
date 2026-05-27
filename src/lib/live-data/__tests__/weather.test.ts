import { describe, expect, it } from "vitest";
import { getWeatherContext, regionPlantingSummary } from "@/lib/live-data/weather";

describe("regionPlantingSummary (deterministic climatology)", () => {
  it("surfaces a region's planting window with an honest frost caveat", () => {
    const s = regionPlantingSummary("Greater Toronto Area, Ontario", "Mid-May to mid-June, or early September");
    expect(s).toContain("Mid-May to mid-June");
    expect(s).toContain("last-frost");
  });

  it("degrades honestly when no window is known", () => {
    const s = regionPlantingSummary("Somewhere", undefined);
    expect(s).toContain("regional planting window");
    expect(s).not.toContain("undefined");
  });
});

describe("getWeatherContext", () => {
  it("resolves a known region id to its label + window, no network", async () => {
    const res = await getWeatherContext("gta-ontario");
    expect(res?.value.locationLabel).toContain("Greater Toronto Area");
    expect(res?.value.summary).toContain("planting window");
    // Deterministic, key-free source — never claims a live forecast.
    expect(res?.source.sourceName).toMatch(/Core Library/i);
  });

  it("falls back to the raw query for unknown locations", async () => {
    const res = await getWeatherContext("Narnia");
    expect(res?.value.locationLabel).toBe("Narnia");
  });
});
