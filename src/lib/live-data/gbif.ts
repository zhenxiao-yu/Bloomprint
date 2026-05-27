/**
 * GBIF adapter — free, key-free, CC0, commercial-OK, generous.
 *
 * Two reads, both polite + cached:
 *  - species/match  → accepted canonical name, family, usageKey (name resolution)
 *  - species/{key}/distributions → establishmentMeans (native / introduced / invasive context)
 *
 * Everything is regional CONTEXT, never a legal determination — the Core Library's locked
 * `invasive` flag remains authoritative; GBIF only adds honest, sourced wording.
 */
import { z } from "zod";
import { freeFetchJson } from "@/lib/live-data/freeFetch";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import { getCached, setCached } from "@/lib/live-data/cache";
import type { CachedLiveData, GbifContext } from "@/lib/live-data/types";

const GBIF = "https://api.gbif.org/v1";
const REVALIDATE = Math.floor(getCachePolicy("gbif").ttlMs / 1000);

const MatchResponse = z.object({
  usageKey: z.number().optional(),
  matchType: z.string().optional(),
  canonicalName: z.string().optional(),
  scientificName: z.string().optional(),
  family: z.string().optional(),
  rank: z.string().optional(),
});

const DistributionsResponse = z.object({
  results: z
    .array(z.object({ establishmentMeans: z.string().nullish() }))
    .default([]),
});

export interface GbifPlantData {
  usageKey: number;
  canonicalName?: string;
  family?: string;
  /** Lowercased establishmentMeans values seen across distributions (e.g. "invasive", "native"). */
  establishmentMeans: string[];
}

/** Resolve a plant name to its GBIF accepted record (Plantae only). Null on no match/failure. */
export async function gbifMatch(name: string): Promise<{ usageKey: number; canonicalName?: string; family?: string } | null> {
  const url = `${GBIF}/species/match?kingdom=Plantae&name=${encodeURIComponent(name)}`;
  const parsed = MatchResponse.safeParse(await freeFetchJson(url, { revalidateSeconds: REVALIDATE }));
  if (!parsed.success) return null;
  const m = parsed.data;
  if (!m.usageKey || m.matchType === "NONE") return null;
  return { usageKey: m.usageKey, canonicalName: m.canonicalName ?? m.scientificName, family: m.family };
}

/** Distinct establishmentMeans across GBIF distributions for a usageKey (lowercased). */
export async function gbifEstablishmentMeans(usageKey: number): Promise<string[]> {
  const url = `${GBIF}/species/${usageKey}/distributions?limit=100`;
  const parsed = DistributionsResponse.safeParse(await freeFetchJson(url, { revalidateSeconds: REVALIDATE }));
  if (!parsed.success) return [];
  const means = new Set<string>();
  for (const r of parsed.data.results) if (r.establishmentMeans) means.add(r.establishmentMeans.toLowerCase());
  return [...means];
}

/** Full GBIF read for a name: match → establishment. Used by the build-time prefetch and runtime misses. */
export async function gbifPlantData(name: string): Promise<GbifPlantData | null> {
  const match = await gbifMatch(name);
  if (!match) return null;
  const establishmentMeans = await gbifEstablishmentMeans(match.usageKey);
  return { usageKey: match.usageKey, canonicalName: match.canonicalName, family: match.family, establishmentMeans };
}

// Legacy occurrence-context seam (kept for the gateway interface). Honest mock only.
export async function getGbifContext(scientificName: string): Promise<CachedLiveData<GbifContext> | null> {
  const key = `gbif:${scientificName.toLowerCase()}`;
  const cached = getCached<GbifContext>(key);
  if (cached) return cached;
  return setCached(
    key,
    {
      scientificName,
      occurrenceCount: 0,
      note: "GBIF occurrence is supporting context only, not proof of yard suitability.",
    },
    getCachePolicy("gbif"),
    {
      name: "GBIF occurrence context",
      sourceName: "GBIF (gbif.org)",
      sourceType: "live-context",
      level: 4,
      url: "https://www.gbif.org/",
      supports: ["regional occurrence context only"],
      confidence: "low",
      cacheStatus: "fresh",
      sourceQuality: "Official sources",
      needsLocalVerification: true,
    },
  );
}
