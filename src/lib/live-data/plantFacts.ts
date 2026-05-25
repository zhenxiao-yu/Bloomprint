/**
 * Plant care enrichment (Perenual).
 *
 * ENRICHMENT ONLY: care/water/sun summaries, flowering season, and images. It never sets
 * hardiness, toxicity, or invasive status — those stay locked in the Core Library. The mock
 * returns an honest generic note with NO bloom data (never fabricates cultivar specifics).
 * The real Perenual adapter runs behind `LIVE_DATA_PROVIDER=perenual` + `PERENUAL_API_KEY`;
 * on a missing key or any failure it returns null so the plan stands on its own.
 */
import { z } from "zod";
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import type { PlantFacts } from "@/lib/live-data/schema";
import type { CachedLiveData } from "@/lib/live-data/types";
import type { SourceRef } from "@/domain/models";

const PERENUAL_BASE = "https://perenual.com/api/v2";
const FETCH_TIMEOUT_MS = 8000;

/** Perenual responses are inconsistent with nulls/missing keys — parse defensively. */
const PerenualList = z.object({ data: z.array(z.object({ id: z.number() })).default([]) });
const PerenualDetails = z.object({
  common_name: z.string().nullish(),
  watering: z.string().nullish(),
  sunlight: z.array(z.string()).nullish(),
  flowering_season: z.string().nullish(),
  default_image: z.object({ regular_url: z.string().nullish() }).nullish(),
});
type PerenualDetails = z.infer<typeof PerenualDetails>;

function perenualSource(retrievedAt: string): SourceRef {
  return {
    name: "Perenual plant database",
    sourceName: "Perenual",
    sourceType: "extension-botanical",
    level: 4,
    retrievedAt,
    supports: ["care, watering, sunlight, and flowering-season wording only"],
    confidence: "medium",
    cacheStatus: "fresh",
    sourceQuality: "Extension / botanical",
    needsLocalVerification: true,
  };
}

/**
 * Pure mapper from a parsed Perenual details record to our care-layer PlantFacts.
 * Exported so the mapping can be unit-tested without any network. Sets `bloom` only from
 * the provider's `flowering_season` — never invented.
 */
export function mapPerenualToFacts(
  details: PerenualDetails,
  scientificName: string,
  commonName: string | undefined,
  retrievedAt: string,
): PlantFacts {
  const sunlight = details.sunlight?.filter(Boolean).join(", ") || undefined;
  return {
    scientificName,
    commonName: details.common_name ?? commonName,
    watering: details.watering ?? undefined,
    sunlight,
    bloom: details.flowering_season ?? undefined,
    imageUrl: details.default_image?.regular_url ?? undefined,
    source: perenualSource(retrievedAt),
    lastCheckedAt: retrievedAt,
  };
}

/** Cap on `species/details` calls per lookup — bounds free-tier rate-limit usage. */
const MAX_DETAIL_ATTEMPTS = 3;
/** Cap on distinct search queries (exact → base species → synonyms) — bounds outbound calls. */
const MAX_SEARCH_QUERIES = 4;

/**
 * Drop the cultivar so we can fall back from a gated cultivar record to its base species.
 * "Hydrangea paniculata 'Limelight'" → "Hydrangea paniculata". Returns null if unchanged.
 */
export function baseSpecies(scientificName: string): string | null {
  const tokens = scientificName.trim().split(/\s+/);
  // Need a genus + a species epithet. If the 2nd token is a quoted cultivar
  // (e.g. "Nepeta 'Walker's Low'"), there's no species epithet to fall back to.
  if (tokens.length < 2 || tokens[1].startsWith("'")) return null;
  const base = `${tokens[0]} ${tokens[1]}`;
  // Only a fallback if it actually drops something (a cultivar / extra qualifier).
  return base.length < scientificName.trim().length ? base : null;
}

/**
 * Live Perenual lookup: species search → details → mapped facts. Null on any failure.
 * Perenual's free tier gates `species/details` for many cultivar IDs (HTTP 429 "upgrade"),
 * so we try the exact name first and then the base species, taking the first record whose
 * details actually resolve — capped at {@link MAX_DETAIL_ATTEMPTS} calls.
 */
async function fetchPerenualFacts(
  scientificName: string,
  commonName?: string,
  synonyms: string[] = [],
): Promise<PlantFacts | null> {
  const apiKey = process.env.PERENUAL_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // Exact name first, then base species, then USDA synonyms — deduped and capped so
    // a missed cultivar can still resolve via a known alternate name without unbounded calls.
    const queries = [...new Set([scientificName, baseSpecies(scientificName), ...synonyms])]
      .filter((q): q is string => Boolean(q))
      .slice(0, MAX_SEARCH_QUERIES);
    let attempts = 0;
    for (const query of queries) {
      const listRes = await fetch(
        `${PERENUAL_BASE}/species-list?key=${apiKey}&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );
      if (!listRes.ok) continue;
      const list = PerenualList.safeParse(await listRes.json());
      const ids = list.success ? list.data.data.slice(0, 2).map((d) => d.id) : [];
      for (const id of ids) {
        if (attempts >= MAX_DETAIL_ATTEMPTS) return null;
        attempts++;
        const detailRes = await fetch(`${PERENUAL_BASE}/species/details/${id}?key=${apiKey}`, {
          signal: controller.signal,
        });
        if (!detailRes.ok) continue; // gated/404 → try the next candidate
        const details = PerenualDetails.safeParse(await detailRes.json());
        if (!details.success) continue;
        return mapPerenualToFacts(details.data, scientificName, commonName, new Date().toISOString());
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function factsSource(retrievedAt: string): SourceRef {
  return {
    name: "Plant care reference",
    sourceName: "Bloomprint Core Library (care summary)",
    sourceType: "extension-botanical",
    level: 4,
    retrievedAt,
    supports: ["general care wording only"],
    confidence: "medium",
    cacheStatus: "disabled",
    sourceQuality: "Extension / botanical",
    needsLocalVerification: true,
  };
}

function mockFacts(scientificName: string, commonName?: string): PlantFacts {
  const lastCheckedAt = new Date().toISOString();
  return {
    scientificName,
    commonName,
    careSummary:
      "General care follows the Bloomprint Core Library. Confirm cultivar-specific watering, light, and spacing on the plant tag at purchase.",
    source: factsSource(lastCheckedAt),
    lastCheckedAt,
  };
}

export async function getPlantFacts(
  scientificName: string,
  commonName?: string,
  synonyms: string[] = [],
): Promise<CachedLiveData<PlantFacts> | null> {
  const key = `plant-facts:${scientificName.toLowerCase()}`;
  const cached = getCached<PlantFacts>(key);
  if (cached) return cached;
  if (process.env.LIVE_DATA_PROVIDER === "perenual") {
    // Real provider configured: use live facts when we get them, otherwise return null.
    // We never fall back to the mock here — that would label fabricated wording as "live".
    const live = await fetchPerenualFacts(scientificName, commonName, synonyms);
    if (live) return setCached(key, live, getCachePolicy("plant-facts"), live.source);
    return null;
  }
  return setCached(key, mockFacts(scientificName, commonName), getCachePolicy("plant-facts"), factsSource(new Date().toISOString()));
}
