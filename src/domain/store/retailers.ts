/**
 * Region-aware retailer SEARCH links — generated URLs only, never live inventory or pricing.
 *
 * Honest contract (docs/DECISIONS.md, KNOWN_LIMITATIONS): every result carries
 * {@link RETAILER_WARNING}; we never claim stock, aisle, or a final/checkout price. These are
 * keyless deep links into each retailer's own search — the user verifies on the retailer site.
 */

export type RetailerCountry = "US" | "CA";

export interface RetailerSearchTemplate {
  /** Stable id (e.g. "home-depot-ca"). */
  id: string;
  /** Display name shown on the chip. */
  label: string;
  country: RetailerCountry;
  /** Builds a search URL for a query. */
  build: (query: string) => string;
}

/** Mandatory disclaimer shown with every retailer search result. */
export const RETAILER_WARNING =
  "Bloomprint cannot guarantee live stock or final checkout price. Verify on the retailer site before driving.";

const q = (s: string) => encodeURIComponent(s.trim());

/** Canadian retailers (default for non-US regions — Bloomprint is Ontario-first). */
const CA_TEMPLATES: RetailerSearchTemplate[] = [
  { id: "home-depot-ca", label: "Home Depot Canada", country: "CA", build: (s) => `https://www.homedepot.ca/search?q=${q(s)}` },
  { id: "canadian-tire", label: "Canadian Tire", country: "CA", build: (s) => `https://www.canadiantire.ca/en/search-results.html?q=${q(s)}` },
  { id: "rona", label: "RONA", country: "CA", build: (s) => `https://www.rona.ca/en/search?query=${q(s)}` },
  { id: "home-hardware", label: "Home Hardware", country: "CA", build: (s) => `https://www.homehardware.ca/en/search?q=${q(s)}` },
  { id: "amazon-ca", label: "Amazon.ca", country: "CA", build: (s) => `https://www.amazon.ca/s?k=${q(s)}` },
  { id: "nursery-ca", label: "Local nursery", country: "CA", build: (s) => `https://www.google.com/maps/search/${q(s + " garden centre near me")}` },
  { id: "web-ca", label: "Web search", country: "CA", build: (s) => `https://www.google.com/search?q=${q(s + " garden Canada")}` },
];

/** US retailers (kept for the US region presets in regions.ts). */
const US_TEMPLATES: RetailerSearchTemplate[] = [
  { id: "home-depot-us", label: "Home Depot", country: "US", build: (s) => `https://www.homedepot.com/s/${q(s)}` },
  { id: "lowes-us", label: "Lowe's", country: "US", build: (s) => `https://www.lowes.com/search?searchTerm=${q(s)}` },
  { id: "amazon-us", label: "Amazon", country: "US", build: (s) => `https://www.amazon.com/s?k=${q(s)}` },
  { id: "nursery-us", label: "Local nursery", country: "US", build: (s) => `https://www.google.com/maps/search/${q(s + " garden center near me")}` },
  { id: "web-us", label: "Web search", country: "US", build: (s) => `https://www.google.com/search?q=${q(s + " garden")}` },
];

/**
 * Region → country. Region ids in domain/data/regions.ts use a `us-*` prefix for US presets and
 * Canadian names (gta-ontario, ottawa-valley, …) otherwise — so anything not `us-*` is Canadian.
 */
export function countryForRegion(regionId: string | undefined): RetailerCountry {
  return regionId?.startsWith("us-") ? "US" : "CA";
}

export function retailerTemplatesForCountry(country: RetailerCountry): RetailerSearchTemplate[] {
  return country === "US" ? US_TEMPLATES : CA_TEMPLATES;
}

export interface RetailerSearchLink {
  retailerId: string;
  label: string;
  url: string;
}

/** Region-aware search links for an item query. The UI renders these + {@link RETAILER_WARNING}. */
export function getRetailerSearchLinks(query: string, regionId?: string): RetailerSearchLink[] {
  const templates = retailerTemplatesForCountry(countryForRegion(regionId));
  return templates.map((t) => ({ retailerId: t.id, label: t.label, url: t.build(query) }));
}

/** "Garden centres near me" map link, localized spelling. */
export function nearbyGardenCentersUrl(regionId?: string): string {
  const phrase = countryForRegion(regionId) === "CA" ? "garden centre near me" : "garden center near me";
  return `https://www.google.com/maps/search/${q(phrase)}`;
}
