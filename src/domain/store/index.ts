/**
 * Store reality check — honest shopping help with NO live-inventory claims (docs/DECISIONS.md).
 * We give a search query + an availability *state* per item and deep-link to retailer searches and
 * a "garden centers near me" map. Live distances/inventory need keys and are deferred.
 */
import type { AvailabilityState, ShoppingItem, StoreSearch } from "@/domain/models";

function availabilityFor(item: ShoppingItem): AvailabilityState {
  if (item.category === "Plants") return "needs-local-check"; // cultivar availability varies
  if (item.category === "lighting") return "verify-online";
  return "likely-common"; // mulch, soil, stone, edging, fabric
}

function queryFor(item: ShoppingItem): string {
  if (item.category === "Plants") return item.name;
  return `${item.name}`.trim();
}

export function buildStoreSearches(shoppingList: ShoppingItem[]): StoreSearch[] {
  return shoppingList
    .filter((i) => i.priority !== "optional")
    .map((i) => ({ name: i.name, query: queryFor(i), availability: availabilityFor(i) }));
}

/* Keyless retailer deep links (used by the UI). */
export function homeDepotSearchUrl(q: string): string {
  return `https://www.homedepot.com/s/${encodeURIComponent(q)}`;
}
export function lowesSearchUrl(q: string): string {
  return `https://www.lowes.com/search?searchTerm=${encodeURIComponent(q)}`;
}
export function webSearchUrl(q: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(q + " garden")}`;
}
export function nearbyGardenCentersUrl(): string {
  return "https://www.google.com/maps/search/garden+center+near+me";
}

export const AVAILABILITY_LABEL: Record<AvailabilityState, string> = {
  "likely-common": "Usually in stock",
  "needs-local-check": "Check local availability",
  "specialty-order": "May need a special order",
  "verify-online": "Verify online",
};
