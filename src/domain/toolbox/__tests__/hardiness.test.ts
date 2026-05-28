import { describe, expect, it } from "vitest";

import {
  isCanadianPostal,
  isValidUsZip,
  parseHardiness,
  zoneTempRangeF,
  USDA_ZONES,
} from "@/domain/toolbox/hardiness";

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

describe("zoneTempRangeF (offline, US + Canada)", () => {
  it("computes the standard band for a/b halves", () => {
    expect(zoneTempRangeF("8a")).toEqual({ low: 10, high: 15 });
    expect(zoneTempRangeF("8b")).toEqual({ low: 15, high: 20 });
    expect(zoneTempRangeF("8")).toEqual({ low: 10, high: 20 });
  });
  it("handles cold Canadian zones and rejects junk", () => {
    expect(zoneTempRangeF("3a")).toEqual({ low: -40, high: -35 });
    expect(zoneTempRangeF("zone")).toBeNull();
    expect(zoneTempRangeF("99")).toBeNull();
  });
  it("exposes a US/CA zone list for the picker", () => {
    expect(USDA_ZONES).toContain("3a");
    expect(USDA_ZONES).toContain("11b");
  });
});

describe("isCanadianPostal", () => {
  it("detects Canadian postal codes, not US ZIPs", () => {
    expect(isCanadianPostal("K1A 0B1")).toBe(true);
    expect(isCanadianPostal("M5V2T6")).toBe(true);
    expect(isCanadianPostal("20001")).toBe(false);
  });
});
