import { describe, expect, it } from "vitest";
import { buildInvasiveRisk } from "@/lib/live-data/invasive";

describe("buildInvasiveRisk — locked flag + GBIF establishment context", () => {
  it("warns when the Core Library flags it, citing the library", () => {
    const r = buildInvasiveRisk("Berberis thunbergii", true, "Japanese barberry", []);
    expect(r.flagged).toBe(true);
    expect(r.note).toMatch(/invasive/i);
    expect(r.note).toMatch(/Bloomprint's library/);
  });

  it("warns when GBIF records list it invasive even if the library does not", () => {
    const r = buildInvasiveRisk("Picea glauca", false, "White spruce", ["native", "invasive"]);
    expect(r.note).toMatch(/GBIF records/);
    expect(r.source.sourceName).toMatch(/GBIF/);
  });

  it("notes introduced/non-native status without over-claiming", () => {
    const r = buildInvasiveRisk("Buxus sempervirens", false, "Boxwood", ["introduced"]);
    expect(r.note).toMatch(/introduced/i);
    expect(r.flagged).toBe(false);
  });

  it("reassures (but still says verify) for native-only records", () => {
    const r = buildInvasiveRisk("Ilex glabra", false, "Inkberry", ["native"]);
    expect(r.note).toMatch(/native/i);
    expect(r.note).toMatch(/verify/i);
  });

  it("falls back to a library-only note with no GBIF data", () => {
    const r = buildInvasiveRisk("Hosta sp.", false, "Hosta", []);
    expect(r.note).toMatch(/verify locally/i);
    expect(r.source.sourceName).not.toMatch(/GBIF/);
  });
});
