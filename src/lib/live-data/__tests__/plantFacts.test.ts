import { describe, expect, it } from "vitest";
import { mapPerenualToFacts } from "@/lib/live-data/plantFacts";
import { getLiveEnrichment } from "@/lib/live-data/enrich";
import { EnrichPlanRequest, PlantFacts } from "@/lib/live-data/schema";

const retrievedAt = "2026-05-24T00:00:00.000Z";

describe("mapPerenualToFacts — sourced bloom/care, never fabricated", () => {
  it("maps flowering_season -> bloom, joins sunlight, and attributes Perenual", () => {
    const facts = mapPerenualToFacts(
      {
        common_name: "Emerald Cedar",
        watering: "Average",
        sunlight: ["full sun", "part shade"],
        flowering_season: "Spring to early summer",
        default_image: { regular_url: "https://example.com/img.jpg" },
      },
      "Thuja occidentalis 'Smaragd'",
      "Emerald Cedar",
      retrievedAt,
    );
    expect(() => PlantFacts.parse(facts)).not.toThrow();
    expect(facts.bloom).toBe("Spring to early summer");
    expect(facts.sunlight).toBe("full sun, part shade");
    expect(facts.watering).toBe("Average");
    expect(facts.imageUrl).toBe("https://example.com/img.jpg");
    expect(facts.source.sourceName).toBe("Perenual");
    expect(facts.source.needsLocalVerification).toBe(true);
  });

  it("leaves bloom/sunlight undefined when the provider has none (no invention)", () => {
    const facts = mapPerenualToFacts(
      {
        common_name: null,
        watering: null,
        sunlight: null,
        flowering_season: null,
        default_image: null,
      },
      "Acer palmatum",
      "Japanese Maple",
      retrievedAt,
    );
    expect(facts.bloom).toBeUndefined();
    expect(facts.sunlight).toBeUndefined();
    expect(facts.watering).toBeUndefined();
    // Falls back to the Core Library common name we passed in.
    expect(facts.commonName).toBe("Japanese Maple");
  });
});

describe("plant facts mock — honest and bloom-free by default", () => {
  it("never sets a fabricated bloom in mock-only mode", async () => {
    const out = await getLiveEnrichment(
      EnrichPlanRequest.parse({
        plants: [{ plantId: "emerald-cedar", commonName: "Emerald Cedar" }],
      }),
    );
    expect(out.plantFacts.length).toBeGreaterThan(0);
    for (const f of out.plantFacts) expect(f.bloom).toBeUndefined();
  });
});
