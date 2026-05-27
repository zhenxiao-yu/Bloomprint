import { describe, expect, it } from "vitest";
import { isUsZip, parseZoneNumber, plantsOutOfZone } from "@/lib/live-data/hardiness";

describe("isUsZip", () => {
  it("accepts a US 5-digit ZIP (trimmed)", () => {
    expect(isUsZip("20001")).toBe(true);
    expect(isUsZip("  90210 ")).toBe(true);
  });
  it("rejects non-ZIP queries", () => {
    expect(isUsZip("K1A 0B1")).toBe(false); // Canadian postal
    expect(isUsZip("gta-ontario")).toBe(false); // regionId
    expect(isUsZip("2001")).toBe(false); // too short
    expect(isUsZip("200015")).toBe(false); // too long
    expect(isUsZip(undefined)).toBe(false);
    expect(isUsZip(null)).toBe(false);
  });
});

describe("parseZoneNumber", () => {
  it("extracts the leading integer of a USDA zone label", () => {
    expect(parseZoneNumber("8a")).toBe(8);
    expect(parseZoneNumber("10b")).toBe(10);
    expect(parseZoneNumber(" 5 ")).toBe(5);
  });
  it("returns null when unparseable", () => {
    expect(parseZoneNumber("abc")).toBeNull();
    expect(parseZoneNumber("")).toBeNull();
  });
});

describe("plantsOutOfZone", () => {
  const plants = [
    { commonName: "Emerald Cedar", hardinessMin: 3 },
    { commonName: "Crepe Myrtle", hardinessMin: 7 },
    { commonName: "Bougainvillea", hardinessMin: 9 },
  ];

  it("flags only plants whose cold-hardiness minimum is warmer than the zone", () => {
    // Zone 5: cedar (min 3) ok; crepe myrtle (7) and bougainvillea (9) too tender.
    expect(plantsOutOfZone(plants, 5)).toEqual(["Crepe Myrtle", "Bougainvillea"]);
  });

  it("flags nothing when the zone covers every plant", () => {
    expect(plantsOutOfZone(plants, 9)).toEqual([]);
  });

  it("is empty for an empty palette", () => {
    expect(plantsOutOfZone([], 5)).toEqual([]);
  });
});
