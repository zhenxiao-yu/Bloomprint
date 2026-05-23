import { describe, expect, it } from "vitest";
import { getLiveEnrichment } from "@/lib/live-data/enrich";
import { EnrichPlanRequest, LivePlanEnrichment, RetailerAvailability } from "@/lib/live-data/schema";

const sample = EnrichPlanRequest.parse({
  region: "Oakville, ON",
  items: [
    { id: "Emerald Cedar", name: "Emerald Cedar", category: "Plants", price: { min: 40, max: 90 } },
    { id: "Mulch", name: "Mulch", category: "mulch" }, // no price
  ],
  plants: [{ plantId: "emerald-cedar", commonName: "Emerald Cedar" }],
});

describe("getLiveEnrichment — mock-first, honest enrichment", () => {
  it("returns a schema-valid payload that reports real providers as off", async () => {
    const out = await getLiveEnrichment(sample);
    expect(() => LivePlanEnrichment.parse(out)).not.toThrow();
    expect(out.enabled).toBe(false); // mock-only deployment
    expect(out.disclaimer).toMatch(/verify/i);
  });

  it("derives price estimates from the plan's own range — never invents a number", async () => {
    const out = await getLiveEnrichment(sample);
    const cedar = out.storeReality.find((s) => s.canonicalName === "Emerald Cedar");
    expect(cedar?.priceRange).toEqual({ low: 40, high: 90, currency: "CAD", confidence: "medium" });
    expect(cedar?.matches.length).toBeGreaterThan(0);
    for (const m of cedar?.matches ?? []) {
      // mock price must equal the deterministic input range, not a fabricated one
      expect(m.price).toEqual({ min: 40, max: 90 });
    }
  });

  it("never claims guaranteed stock or a final price", async () => {
    const out = await getLiveEnrichment(sample);
    const labels = out.storeReality.flatMap((s) => s.matches.map((m) => m.availabilityLabel));
    for (const label of labels) {
      expect(RetailerAvailability.options).toContain(label);
      expect(label).not.toBe("in_stock"); // not even a representable value
    }
  });

  it("does not fabricate a price for items the plan didn't price", async () => {
    const out = await getLiveEnrichment(sample);
    const mulch = out.storeReality.find((s) => s.canonicalName === "Mulch");
    expect(mulch?.priceRange).toBeNull();
  });

  it("lights up weather timing, plant facts, and an invasive caution (quiet when not flagged)", async () => {
    const out = await getLiveEnrichment(sample);
    expect(out.weather).not.toBeNull();
    expect(out.plantFacts.length).toBeGreaterThan(0);
    expect(out.invasive.length).toBeGreaterThan(0);
    // Emerald Cedar is a curated, non-invasive Core Library plant → no false alarm.
    const cedar = out.invasive.find((x) => /cedar/i.test(x.commonName ?? x.scientificName));
    expect(cedar?.flagged).toBe(false);
  });

  it("returns a valid empty enrichment for an empty plan (never throws)", async () => {
    const out = await getLiveEnrichment(EnrichPlanRequest.parse({}));
    expect(() => LivePlanEnrichment.parse(out)).not.toThrow();
    expect(out.storeReality).toEqual([]);
  });
});
