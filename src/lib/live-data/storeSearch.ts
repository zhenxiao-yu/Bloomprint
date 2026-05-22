import { homeDepotSearchUrl, lowesSearchUrl, webSearchUrl } from "@/domain/store";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import { getCached, setCached } from "@/lib/live-data/cache";
import type { CachedLiveData, RetailerSearchTemplate } from "@/lib/live-data/types";

export async function getStoreSearchTemplates(query: string): Promise<CachedLiveData<RetailerSearchTemplate[]>> {
  const key = `store-search:${query.toLowerCase()}`;
  const cached = getCached<RetailerSearchTemplate[]>(key);
  if (cached) return cached;
  return setCached(
    key,
    [
      { retailer: "home-depot", label: "Home Depot search", url: homeDepotSearchUrl(query) },
      { retailer: "lowes", label: "Lowe's search", url: lowesSearchUrl(query) },
      { retailer: "web", label: "Web search", url: webSearchUrl(query) },
    ],
    getCachePolicy("store-search"),
    {
      name: "Static retailer search templates",
      sourceName: "Static retailer search templates",
      sourceType: "retailer-cost",
      level: 5,
      supports: ["search links only, not inventory"],
      confidence: "good",
      sourceQuality: "Retailer / cost references",
      needsLocalVerification: true,
    },
  );
}
