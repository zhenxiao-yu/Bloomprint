/**
 * Live Data Layer — the Zod-validated boundary for plan *enrichment*.
 *
 * Enrichment ANNOTATES the deterministic plan; it never overrides plants,
 * prices, hardiness, toxicity, invasive status, quantities, spacing, or labor
 * (docs/DECISIONS.md D1/D2/D7/D14). We reuse the domain's MoneyRange / SourceRef /
 * ConfidenceLevel so live facts ride the same Source Quality Ladder + cache status.
 *
 * Honesty contract (also enforced by tests):
 *  - prices are estimate RANGES, never a final/checkout price;
 *  - availability is hedged ("appears available" / "verify locally"), never "in stock";
 *  - every live fact carries a source + lastCheckedAt + confidence.
 */
import { z } from "zod";
import { ConfidenceLevel, MoneyRange, SourceRef } from "@/domain/models";

/** Deliberately hedged retailer availability — we never claim guaranteed stock. */
export const RetailerAvailability = z.enum([
  "unknown",
  "appears_available",
  "limited",
  "unavailable",
  "verify_locally",
]);
export type RetailerAvailability = z.infer<typeof RetailerAvailability>;

/** One retailer hit for a shopping item. `price` is an estimate range and may be absent. */
export const RetailerMatch = z.object({
  retailer: z.string(),
  productTitle: z.string(),
  productUrl: z.string(),
  imageUrl: z.string().optional(),
  price: MoneyRange.optional(),
  currency: z.string().default("CAD"),
  sizeLabel: z.string().optional(),
  availabilityLabel: RetailerAvailability.default("verify_locally"),
  distanceKm: z.number().optional(),
  source: SourceRef,
  lastCheckedAt: z.string(),
});
export type RetailerMatch = z.infer<typeof RetailerMatch>;

export const PriceRange = z.object({
  low: z.number().nonnegative(),
  high: z.number().nonnegative(),
  currency: z.string().default("CAD"),
  confidence: ConfidenceLevel,
});
export type PriceRange = z.infer<typeof PriceRange>;

/** Live store reality for a single canonical shopping item. */
export const StoreRealityResult = z.object({
  canonicalItemId: z.string(),
  canonicalName: z.string(),
  searchTerms: z.array(z.string()).default([]),
  matches: z.array(RetailerMatch).default([]),
  priceRange: PriceRange.nullable().default(null),
  substitutions: z.array(z.string()).default([]),
  confidence: ConfidenceLevel,
  warnings: z.array(z.string()).default([]),
  lastCheckedAt: z.string(),
});
export type StoreRealityResult = z.infer<typeof StoreRealityResult>;

export const WeatherTiming = z.object({
  locationLabel: z.string(),
  summary: z.string(),
  plantingNote: z.string(),
  confidence: ConfidenceLevel,
  source: SourceRef,
  lastCheckedAt: z.string(),
});
export type WeatherTiming = z.infer<typeof WeatherTiming>;

/** Care enrichment only — never the source of hardiness/toxicity (those stay locked). */
export const PlantFacts = z.object({
  scientificName: z.string(),
  commonName: z.string().optional(),
  careSummary: z.string().optional(),
  watering: z.string().optional(),
  sunlight: z.string().optional(),
  /** Descriptive flowering season (e.g. "Spring to early summer"). Care-layer enrichment,
   *  not a locked fact — only set from a real provider, never fabricated by the mock. */
  bloom: z.string().optional(),
  imageUrl: z.string().optional(),
  source: SourceRef,
  lastCheckedAt: z.string(),
});
export type PlantFacts = z.infer<typeof PlantFacts>;

/** Warning layer — combines the locked `invasive` flag with regional context. No legal claims. */
export const InvasiveRisk = z.object({
  scientificName: z.string(),
  commonName: z.string().optional(),
  flagged: z.boolean(),
  note: z.string(),
  source: SourceRef,
  lastCheckedAt: z.string(),
});
export type InvasiveRisk = z.infer<typeof InvasiveRisk>;

/**
 * Location-precise USDA hardiness zone (from a US ZIP), with an honest comparison against the
 * plan's plants. Sharpens the engine's region-level zone; enriches, never overrides locked facts.
 */
export const HardinessContext = z.object({
  query: z.string(),
  zone: z.string(),
  temperatureRange: z.string().optional(),
  /** Plant common names whose Core Library cold-hardiness range may not cover this zone. */
  outOfRange: z.array(z.string()).default([]),
  source: SourceRef,
  lastCheckedAt: z.string(),
});
export type HardinessContext = z.infer<typeof HardinessContext>;

/** The whole enrichment payload returned by POST /api/live/enrich-plan. */
export const LivePlanEnrichment = z.object({
  /** True only when REAL providers are configured; mock-only deployments report false. */
  enabled: z.boolean(),
  generatedAt: z.string(),
  storeReality: z.array(StoreRealityResult).default([]),
  weather: WeatherTiming.nullable().default(null),
  plantFacts: z.array(PlantFacts).default([]),
  invasive: z.array(InvasiveRisk).default([]),
  hardiness: HardinessContext.nullable().default(null),
  disclaimer: z.string(),
});
export type LivePlanEnrichment = z.infer<typeof LivePlanEnrichment>;

/** Slim, secret-free plan summary the client POSTs. Caps array sizes defensively. */
export const EnrichPlanRequest = z.object({
  region: z.string().max(120).optional(),
  postalCode: z.string().max(20).optional(),
  items: z
    .array(
      z.object({
        id: z.string().max(120),
        name: z.string().max(160),
        category: z.string().max(80),
        price: MoneyRange.optional(),
      }),
    )
    .max(80)
    .default([]),
  plants: z
    .array(
      z.object({
        plantId: z.string().max(120),
        commonName: z.string().max(160).optional(),
      }),
    )
    .max(80)
    .default([]),
});
export type EnrichPlanRequest = z.infer<typeof EnrichPlanRequest>;

export const LIVE_DISCLAIMER =
  "Live-ish check: prices are estimate ranges and stock varies by store, size, brand, and season. Verify with the retailer before buying.";
