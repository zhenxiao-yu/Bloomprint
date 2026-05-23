/**
 * Live enrichment orchestrator.
 *
 * Composes the mock-first provider modules into one validated payload. It NEVER
 * throws (any failure → a valid empty enrichment) and NEVER mutates the deterministic
 * plan — it only reads the slim summary the client sends and resolves locked facts
 * (botanical name, invasive flag) from the Core Library server-side.
 */
import type { ConfidenceLevel } from "@/domain/models";
import { getPlant } from "@/domain/data";
import { getInvasiveRisk } from "@/lib/live-data/invasive";
import { getPlantFacts } from "@/lib/live-data/plantFacts";
import { getRetailerMatches } from "@/lib/live-data/retailer";
import { getWeatherContext } from "@/lib/live-data/weather";
import {
  type EnrichPlanRequest,
  type InvasiveRisk,
  LIVE_DISCLAIMER,
  LivePlanEnrichment,
  type PlantFacts,
  type StoreRealityResult,
  type WeatherTiming,
} from "@/lib/live-data/schema";

const REAL_PROVIDERS = new Set(["serpapi", "perenual", "open-meteo", "gbif"]);

/** True only when a real provider is configured; mock-only deployments report false. */
export function realProvidersConfigured(): boolean {
  const provider = process.env.LIVE_DATA_PROVIDER;
  return (
    Boolean(provider && REAL_PROVIDERS.has(provider)) ||
    Boolean(process.env.SERPAPI_KEY) ||
    Boolean(process.env.PERENUAL_API_KEY)
  );
}

export async function getLiveEnrichment(req: EnrichPlanRequest): Promise<LivePlanEnrichment> {
  const generatedAt = new Date().toISOString();
  const empty: LivePlanEnrichment = {
    enabled: false,
    generatedAt,
    storeReality: [],
    weather: null,
    plantFacts: [],
    invasive: [],
    disclaimer: LIVE_DISCLAIMER,
  };

  try {
    // Headline: per-item retailer price signals (estimate ranges from the plan's own MoneyRange).
    const storeReality: StoreRealityResult[] = [];
    for (const item of req.items) {
      const res = await getRetailerMatches(item.name, item.price);
      const matches = res?.value ?? [];
      storeReality.push({
        canonicalItemId: item.id,
        canonicalName: item.name,
        searchTerms: [item.name],
        matches,
        priceRange: item.price
          ? { low: item.price.min, high: item.price.max, currency: "CAD", confidence: "medium" }
          : null,
        substitutions: [],
        confidence: (matches.length ? "medium" : "low") satisfies ConfidenceLevel,
        warnings: [],
        lastCheckedAt: matches[0]?.lastCheckedAt ?? generatedAt,
      });
    }

    // Weather / planting timing.
    const region = req.region?.trim() || "your area";
    const weatherRes = await getWeatherContext(region);
    const weather: WeatherTiming | null = weatherRes
      ? {
          locationLabel: weatherRes.value.locationLabel,
          summary: weatherRes.value.summary,
          plantingNote:
            "Follow Bloomprint's regional planting window; confirm a dry-enough stretch before laying stone or heavy materials.",
          confidence: weatherRes.source.confidence ?? "low",
          source: weatherRes.source,
          lastCheckedAt: weatherRes.value.retrievedAt,
        }
      : null;

    // Plant facts + invasive caution — botanical name & locked invasive flag resolved server-side.
    const plantFacts: PlantFacts[] = [];
    const invasive: InvasiveRisk[] = [];
    for (const plant of req.plants) {
      const record = getPlant(plant.plantId);
      const scientificName = record?.botanicalName ?? plant.commonName ?? plant.plantId;
      const commonName = record?.commonName ?? plant.commonName;
      const facts = await getPlantFacts(scientificName, commonName);
      if (facts) plantFacts.push(facts.value);
      const risk = await getInvasiveRisk(scientificName, Boolean(record?.invasive), commonName);
      if (risk) invasive.push(risk.value);
    }

    return LivePlanEnrichment.parse({
      enabled: realProvidersConfigured(),
      generatedAt,
      storeReality,
      weather,
      plantFacts,
      invasive,
      disclaimer: LIVE_DISCLAIMER,
    });
  } catch {
    return empty;
  }
}
