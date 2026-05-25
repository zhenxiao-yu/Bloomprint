/**
 * USDA plant hardiness zone for a US ZIP, via the keyless, public-domain phzmapi service
 * (derived from the USDA Plant Hardiness Zone Map). Enrichment only: it sharpens the engine's
 * region-level zone to a location-precise one and flags plants whose Core Library cold-hardiness
 * may not cover it — it never mutates the deterministic plan. Offline / non-US-ZIP → caller skips
 * it and the engine's region-level zone stands.
 */
import { z } from "zod";
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import type { CachedLiveData } from "@/lib/live-data/types";
import type { SourceRef } from "@/domain/models";

const PHZM_BASE = "https://phzmapi.org";
const FETCH_TIMEOUT_MS = 8000;

const PhzmResponse = z.object({ zone: z.string(), temperature_range: z.string().optional() });

export interface HardinessZone {
  zone: string;
  temperatureRange?: string;
}

/** phzmapi only accepts a US 5-digit ZIP — anything else (city, Canadian postal, regionId) is skipped. */
export function isUsZip(query: string | undefined | null): boolean {
  return typeof query === "string" && /^\d{5}$/.test(query.trim());
}

/** Leading integer of a USDA zone label ("8a" → 8, "10b" → 10). Null if unparseable. */
export function parseZoneNumber(zone: string): number | null {
  const match = /^(\d{1,2})/.exec(zone.trim());
  return match ? Number(match[1]) : null;
}

/**
 * Plants whose Core Library cold-hardiness *minimum* is warmer than the resolved zone — i.e. they
 * may not survive winter at this location. Heat (max) isn't flagged: heat-zone data is less reliable
 * and "too warm" rarely kills a planting outright.
 */
export function plantsOutOfZone(
  plants: { commonName: string; hardinessMin: number }[],
  zoneNumber: number,
): string[] {
  return plants.filter((p) => zoneNumber < p.hardinessMin).map((p) => p.commonName);
}

function source(retrievedAt: string): SourceRef {
  return {
    name: "USDA Plant Hardiness Zone Map",
    sourceName: "USDA Plant Hardiness Zone Map",
    sourceType: "official",
    level: 3,
    url: "https://planthardiness.ars.usda.gov/",
    retrievedAt,
    supports: ["location hardiness zone"],
    confidence: "good",
    cacheStatus: "fresh",
    sourceQuality: "Official sources",
    needsLocalVerification: false,
  };
}

/** Resolve a US ZIP to its USDA hardiness zone. Null on any failure (caller falls back to region). */
export async function getHardinessZone(zip: string): Promise<CachedLiveData<HardinessZone> | null> {
  const key = `hardiness:${zip}`;
  const cached = getCached<HardinessZone>(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${PHZM_BASE}/${zip}.json`, { signal: controller.signal });
    if (!res.ok) return null;
    const parsed = PhzmResponse.safeParse(await res.json());
    if (!parsed.success) return null;
    const value: HardinessZone = {
      zone: parsed.data.zone,
      temperatureRange: parsed.data.temperature_range,
    };
    return setCached(key, value, getCachePolicy("hardiness"), source(new Date().toISOString()));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
