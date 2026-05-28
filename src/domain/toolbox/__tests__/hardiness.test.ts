import { describe, expect, it } from "vitest";

import { isValidUsZip, parseHardiness } from "@/domain/toolbox/hardiness";

describe("isValidUsZip", () => {
  it("accepts 5 digits, rejects everything else", () => {
    expect(isValidUsZip("20001")).toBe(true);
    expect(isValidUsZip("2000")).toBe(false);
    expect(isValidUsZip("K1A0B1")).toBe(false);
    expect(isValidUsZip("")).toBe(false);
  });
});

describe("parseHardiness", () => {
  it("normalizes a phzmapi payload", () => {
    const r = parseHardiness({
      zone: "8a",
      temperature_range: "10 to 15",
      coordinates: { lat: "38.9", lon: "-77.0" },
    });
    expect(r).toEqual({ zone: "8a", tempLowF: 10, tempHighF: 15, lat: 38.9, lon: -77.0 });
  });

  it("handles negative ranges and missing coordinates", () => {
    const r = parseHardiness({ zone: "3b", temperature_range: "-35 to -30" });
    expect(r!.tempLowF).toBe(-35);
    expect(r!.tempHighF).toBe(-30);
    expect(r!.lat).toBeNull();
  });

  it("returns null for a non-matching payload", () => {
    expect(parseHardiness({ foo: "bar" })).toBeNull();
    expect(parseHardiness(null)).toBeNull();
  });
});
