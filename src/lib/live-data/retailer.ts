/**
 * Retailer product matches (live-ish price signals).
 *
 * MVP is mock-only and HONEST: the estimate range is DERIVED from the plan's own
 * deterministic MoneyRange — we never invent a number. A real adapter (e.g. SerpApi
 * Home Depot search) drops in here behind `LIVE_DATA_PROVIDER=serpapi` and returns
 * null until configured, so deterministic logic is never blocked.
 */
import type { MoneyRange } from "@/domain/models";
import { homeDepotSearchUrl, lowesSearchUrl } from "@/domain/store";
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import type { RetailerMatch } from "@/lib/live-data/schema";
import type { CachedLiveData } from "@/lib/live-data/types";
import type { SourceRef } from "@/domain/models";

function estimateSource(retrievedAt: string): SourceRef {
  return {
    name: "Retailer price estimate (Bloomprint range)",
    sourceName: "Bloomprint estimate",
    sourceType: "retailer-cost",
    level: 5,
    retrievedAt,
    supports: ["estimate price range, not a live or final price"],
    confidence: "medium",
    cacheStatus: "disabled",
    sourceQuality: "Retailer / cost references",
    needsLocalVerification: true,
  };
}

function mockMatches(query: string, basePrice?: MoneyRange): RetailerMatch[] {
  const lastCheckedAt = new Date().toISOString();
  const source = estimateSource(lastCheckedAt);
  const common = {
    price: basePrice,
    currency: "CAD",
    availabilityLabel: "verify_locally" as const,
    lastCheckedAt,
    source,
  };
  return [
    { retailer: "Home Depot", productTitle: `Search “${query}”`, productUrl: homeDepotSearchUrl(query), ...common },
    { retailer: "Lowe's", productTitle: `Search “${query}”`, productUrl: lowesSearchUrl(query), ...common },
  ];
}

export async function getRetailerMatches(
  query: string,
  basePrice?: MoneyRange,
): Promise<CachedLiveData<RetailerMatch[]> | null> {
  const priceKey = basePrice ? `${basePrice.min}-${basePrice.max}` : "na";
  const key = `retailer-products:${query.toLowerCase()}:${priceKey}`;
  const cached = getCached<RetailerMatch[]>(key);
  if (cached) return cached;
  // Real adapter deferred — return null so the orchestrator degrades gracefully.
  if (process.env.LIVE_DATA_PROVIDER === "serpapi") return null;
  return setCached(key, mockMatches(query, basePrice), getCachePolicy("retailer-products"), estimateSource(new Date().toISOString()));
}
