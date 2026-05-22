/**
 * Store reality check — honest shopping help with NO live-inventory claims (docs/DECISIONS.md).
 * We give a search query + an availability *state* per item and deep-link to retailer searches and
 * a "garden centers near me" map. Live distances/inventory need keys and are deferred.
 */
import type { AvailabilityState, ShoppingItem, StoreSearch } from "@/domain/models";

function availabilityFor(item: ShoppingItem): AvailabilityState {
  if (item.category === "Plants") return "needs-local-check"; // cultivar availability varies
  if (item.category === "lighting") return "verify-online";
  if (item.name.toLowerCase().includes("stone")) return "verify-online";
  return "likely-common"; // mulch, soil, stone, edging, fabric
}

function queryFor(item: ShoppingItem): string {
  if (item.category === "Plants") return item.name;
  return `${item.name}`.trim();
}

function storeAdviceFor(item: ShoppingItem): Omit<StoreSearch, "name" | "query" | "availability"> {
  const lower = item.name.toLowerCase();
  const heavy = ["mulch", "soil", "stone", "compost"].some((term) => lower.includes(term)) || item.quantity >= 8;
  if (item.category === "Plants") {
    return {
      substitute: "Ask for the same role and mature size: screen, structure, mid-layer, or front edge.",
      cheaperAlternative: "Use smaller pot sizes and let the bed fill in over another season.",
      easierAlternative: "Buy fewer varieties and repeat the best-fitting plant.",
      deliveryRecommended: false,
      note: "Cultivars vary by store and season; verify the plant tag before substituting.",
    };
  }
  if (lower.includes("stone")) {
    return {
      substitute: "Bagged mulch can replace decorative stone for a lighter, cheaper first build.",
      cheaperAlternative: "Mulch instead of stone.",
      easierAlternative: "Use mulch and skip hauling heavy bags.",
      deliveryRecommended: true,
      note: "Stone is heavy and often worth pricing with delivery.",
    };
  }
  return {
    substitute: "Use the closest equivalent product with similar coverage.",
    cheaperAlternative: lower.includes("mulch") ? "Plain shredded mulch instead of dyed or premium mulch." : undefined,
    easierAlternative: heavy ? "Choose delivery or smaller bags if loading is a concern." : undefined,
    deliveryRecommended: heavy,
    note: heavy ? "Call before driving if you need many bags or delivery help." : "Confirm size and coverage on the shelf label.",
  };
}

export function buildStoreSearches(shoppingList: ShoppingItem[]): StoreSearch[] {
  return shoppingList
    .filter((i) => i.priority !== "optional")
    .map((i) => ({
      name: i.name,
      query: queryFor(i),
      availability: availabilityFor(i),
      ...storeAdviceFor(i),
    }));
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
  "likely-common": "Likely common",
  "needs-local-check": "Check local availability",
  "specialty-order": "May need a special order",
  "verify-online": "Verify online",
};
