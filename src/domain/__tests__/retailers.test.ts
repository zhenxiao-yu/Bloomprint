import { describe, expect, it } from "vitest";
import {
  countryForRegion,
  getRetailerSearchLinks,
  retailerTemplatesForCountry,
  nearbyGardenCentersUrl,
  RETAILER_WARNING,
} from "@/domain/store/retailers";

describe("region-aware retailer search links", () => {
  it("routes Ontario/Canadian regions to Canadian retailers", () => {
    expect(countryForRegion("gta-ontario")).toBe("CA");
    expect(countryForRegion("ottawa-valley")).toBe("CA");
    expect(countryForRegion(undefined)).toBe("CA"); // Ontario-first safe default
    const links = getRetailerSearchLinks("emerald cedar", "gta-ontario");
    const labels = links.map((l) => l.label);
    expect(labels).toContain("Home Depot Canada");
    expect(labels).toContain("Canadian Tire");
    expect(labels).toContain("RONA");
    expect(links.every((l) => l.url.startsWith("https://"))).toBe(true);
  });

  it("routes us-* regions to US retailers", () => {
    expect(countryForRegion("us-midwest-chicago")).toBe("US");
    const links = getRetailerSearchLinks("river rock", "us-northeast-boston");
    expect(links.map((l) => l.label)).toContain("Home Depot");
    expect(links.some((l) => l.url.includes("homedepot.com"))).toBe(true);
  });

  it("encodes the query into every template URL", () => {
    for (const country of ["US", "CA"] as const) {
      for (const t of retailerTemplatesForCountry(country)) {
        expect(t.build("cedar mulch")).toContain("cedar%20mulch");
      }
    }
  });

  it("localizes the nearby-centres spelling", () => {
    expect(nearbyGardenCentersUrl("gta-ontario")).toContain("centre");
    expect(nearbyGardenCentersUrl("us-midwest-chicago")).toContain("center");
  });

  it("never claims live stock or final price in the warning", () => {
    const lower = RETAILER_WARNING.toLowerCase();
    expect(lower).toContain("verify");
    expect(lower).not.toContain("in stock");
    expect(lower).not.toContain("final price");
    expect(lower).toContain("cannot guarantee");
  });
});
