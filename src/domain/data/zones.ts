/**
 * Location → hardiness zone lookup (curated, honest).
 *
 * This is NOT a nationwide dataset. It covers well-established North-American metro ZIP prefixes
 * (US, first 3 digits) and Canadian postal regions (FSA, by leading letter) whose USDA/NRCan zones
 * are stable, widely-published facts. A match narrows the coarse region preset to a real zone and
 * raises confidence; anything uncovered falls back to the approximate preset (docs/KNOWN_LIMITATIONS).
 * Zones are still "likely" — microclimates vary — so callers must keep the approximate framing.
 */
export interface ZoneMatch {
  min: number;
  max: number;
  label: string;
  /** "good" for a specific metro ZIP3; "medium" for a broad postal region. */
  precision: "good" | "medium";
}

// US: first 3 ZIP digits → likely USDA zone (2023 map), curated for major metros.
const US_ZIP3: Record<string, ZoneMatch> = {
  "100": { min: 7, max: 7, label: "New York City, NY", precision: "good" },
  "101": { min: 7, max: 7, label: "New York City, NY", precision: "good" },
  "112": { min: 7, max: 7, label: "Brooklyn, NY", precision: "good" },
  "070": { min: 7, max: 7, label: "Northern New Jersey", precision: "good" },
  "021": { min: 6, max: 7, label: "Boston, MA", precision: "good" },
  "060": { min: 6, max: 7, label: "Hartford, CT", precision: "good" },
  "191": { min: 7, max: 7, label: "Philadelphia, PA", precision: "good" },
  "200": { min: 7, max: 7, label: "Washington, DC", precision: "good" },
  "152": { min: 6, max: 6, label: "Pittsburgh, PA", precision: "good" },
  "432": { min: 6, max: 6, label: "Columbus, OH", precision: "good" },
  "480": { min: 6, max: 6, label: "Detroit, MI", precision: "good" },
  "606": { min: 6, max: 6, label: "Chicago, IL", precision: "good" },
  "631": { min: 6, max: 7, label: "St. Louis, MO", precision: "good" },
  "554": { min: 4, max: 5, label: "Minneapolis, MN", precision: "good" },
  "750": { min: 8, max: 8, label: "Dallas, TX", precision: "good" },
  "770": { min: 9, max: 9, label: "Houston, TX", precision: "good" },
  "787": { min: 8, max: 9, label: "Austin, TX", precision: "good" },
  "800": { min: 5, max: 6, label: "Denver, CO", precision: "good" },
  "852": { min: 9, max: 10, label: "Phoenix, AZ", precision: "good" },
  "891": { min: 9, max: 9, label: "Las Vegas, NV", precision: "good" },
  "900": { min: 10, max: 10, label: "Los Angeles, CA", precision: "good" },
  "941": { min: 10, max: 10, label: "San Francisco, CA", precision: "good" },
  "945": { min: 9, max: 10, label: "Oakland / East Bay, CA", precision: "good" },
  "981": { min: 8, max: 9, label: "Seattle, WA", precision: "good" },
  "972": { min: 8, max: 9, label: "Portland, OR", precision: "good" },
  "303": { min: 7, max: 8, label: "Atlanta, GA", precision: "good" },
  "328": { min: 9, max: 9, label: "Orlando, FL", precision: "good" },
};

// Canada: FSA leading letter → broad provincial/regional zone (NRCan), curated.
const CA_FSA_LETTER: Record<string, ZoneMatch> = {
  A: { min: 5, max: 6, label: "Newfoundland", precision: "medium" },
  B: { min: 6, max: 6, label: "Nova Scotia", precision: "medium" },
  C: { min: 5, max: 6, label: "Prince Edward Island", precision: "medium" },
  E: { min: 4, max: 5, label: "New Brunswick", precision: "medium" },
  G: { min: 4, max: 5, label: "Eastern Quebec", precision: "medium" },
  H: { min: 5, max: 6, label: "Montréal", precision: "medium" },
  J: { min: 4, max: 5, label: "Western Quebec", precision: "medium" },
  K: { min: 4, max: 5, label: "Eastern Ontario / Ottawa", precision: "medium" },
  L: { min: 5, max: 6, label: "Golden Horseshoe, ON", precision: "medium" },
  M: { min: 6, max: 7, label: "Toronto, ON", precision: "medium" },
  N: { min: 6, max: 7, label: "Southwestern Ontario", precision: "medium" },
  P: { min: 3, max: 4, label: "Northern Ontario", precision: "medium" },
  R: { min: 3, max: 4, label: "Manitoba", precision: "medium" },
  S: { min: 3, max: 3, label: "Saskatchewan", precision: "medium" },
  T: { min: 3, max: 4, label: "Alberta", precision: "medium" },
  V: { min: 7, max: 8, label: "British Columbia (coastal)", precision: "medium" },
  X: { min: 0, max: 2, label: "Northern Territories", precision: "medium" },
  Y: { min: 0, max: 2, label: "Yukon", precision: "medium" },
};

/** Look up a likely hardiness zone from a US ZIP or Canadian postal code. null if uncovered. */
export function lookupZone(query: string): ZoneMatch | null {
  const q = query.trim().toUpperCase();
  if (!q) return null;

  // US ZIP: 5 digits (or ZIP+4) → first 3.
  if (/^\d{3}/.test(q)) {
    return US_ZIP3[q.slice(0, 3)] ?? null;
  }

  // Canada FSA: letter-digit-letter (e.g. "M5V" or "M5V 2T6") → leading letter.
  const compact = q.replace(/\s/g, "");
  if (/^[A-Z]\d[A-Z]/.test(compact)) {
    return CA_FSA_LETTER[compact[0]] ?? null;
  }

  return null;
}
