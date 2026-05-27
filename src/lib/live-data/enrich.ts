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
import { getHardinessZone, isUsZip, parseZoneNumber, plantsOutOfZone } from "@/lib/live-data/hardiness";
import { getInvasiveRisk } from "@/lib/live-data/invasive";
import { getPlantFacts } from "@/lib/live-data/plantFacts";
import { getRetailerMatches } from "@/lib/live-data/retailer";
import { getWeatherContext } from "@/lib/live-data/weather";
import {
  type EnrichPlanRequest,
  type HardinessContext,
  type InvasiveRisk,
  LIVE_DISCLAIMER,
  LivePlanEnrichment,
  type PlantFacts,
  type StoreRealityResult,
  type WeatherTiming,
} from "@/lib/live-data/schema";

const REAL_PROVIDERS = new Set(["serpapi", "perenual", "open-meteo", "gbif"]);

/** True only when a real *paid* provider is configured (legacy seam; kept for freeDataMode). */
export function realProvidersConfigured(): boolean {
  const provider = process.env.LIVE_DATA_PROVIDER;
  return (
    Boolean(provider && REAL_PROVIDERS.has(provider)) ||
    Boolean(process.env.SERPAPI_KEY) ||
    Boolean(process.env.PERENUAL_API_KEY)
  );
}

/**
 * The live layer now runs on free, key-free, commercial-OK sources (GBIF, USDA phzmapi,
 * regional climatology) that are always available and cache/prefetch-protected — so enrichment
 * is ON by default. One env kill-switch (`LIVE_DATA_ENRICHMENT=off`) disables the whole layer.
 */
export function freeDataEnrichmentEnabled(): boolean {
  return process.env.LIVE_DATA_ENRICHMENT !== "off";
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
    hardiness: null,
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
      const risk = await getInvasiveRisk(
        scientificName,
        Boolean(record?.invasive),
        commonName,
        plant.plantId,
      );
      if (risk) invasive.push(risk.value);
    }

    // Location-precise hardiness zone — only for a US ZIP, and only when live data is on
    // (keyless public source, but we still respect the master live-data switch). Flags any plant
    // whose Core Library cold-hardiness may not cover the resolved zone. Region zone stands otherwise.
    let hardiness: HardinessContext | null = null;
    if (freeDataEnrichmentEnabled() && isUsZip(req.region)) {
      const zip = req.region!.trim();
      const res = await getHardinessZone(zip);
      if (res) {
        const zoneNumber = parseZoneNumber(res.value.zone);
        const knownPlants = req.plants
          .map((p) => getPlant(p.plantId))
          .filter((rec): rec is NonNullable<typeof rec> => !!rec)
          .map((rec) => ({ commonName: rec.commonName, hardinessMin: rec.hardinessMin }));
        hardiness = {
          query: zip,
          zone: res.value.zone,
          temperatureRange: res.value.temperatureRange,
          outOfRange: zoneNumber != null ? plantsOutOfZone(knownPlants, zoneNumber) : [],
          source: res.source,
          lastCheckedAt: res.retrievedAt,
        };
      }
    }

    return LivePlanEnrichment.parse({
      enabled: freeDataEnrichmentEnabled(),
      generatedAt,
      storeReality,
      weather,
      plantFacts,
      invasive,
      hardiness,
      disclaimer: LIVE_DISCLAIMER,
    });
  } catch {
    return empty;
  }
}
