/**
 * Invasive / ecological caution — a WARNING layer, never a legal claim.
 *
 * The `flagged` boolean is the LOCKED Core Library `invasive` flag (authoritative). On top of
 * it we add honest regional context from GBIF's establishmentMeans (native / introduced /
 * invasive across distributions) — free, key-free, CC0. Known plants read the build-time
 * prefetch artifact (zero network); unknown names do one cached GBIF lookup.
 */
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import { gbifPlantData } from "@/lib/live-data/gbif";
import { getPrefetchedPlantData } from "@/lib/live-data/plantEnrichment";
import type { InvasiveRisk } from "@/lib/live-data/schema";
import type { CachedLiveData } from "@/lib/live-data/types";
import type { SourceRef } from "@/domain/models";

function invasiveSource(retrievedAt: string, fromGbif: boolean): SourceRef {
  return {
    name: "Invasive-species context",
    sourceName: fromGbif
      ? "Bloomprint library + GBIF establishment data (gbif.org)"
      : "Bloomprint library + regional references",
    sourceType: "extension-botanical",
    level: 4,
    url: fromGbif ? "https://www.gbif.org/" : undefined,
    retrievedAt,
    supports: ["regional caution only, not a legal determination"],
    confidence: "medium",
    cacheStatus: "fresh",
    sourceQuality: "Official sources",
    needsLocalVerification: true,
  };
}

/**
 * Pure mapper: merge the locked library flag with GBIF establishmentMeans into one honest note.
 * Exported for unit testing without any network.
 */
export function buildInvasiveRisk(
  scientificName: string,
  flagged: boolean,
  commonName: string | undefined,
  establishmentMeans: string[],
): InvasiveRisk {
  const lastCheckedAt = new Date().toISOString();
  const means = new Set(establishmentMeans.map((m) => m.toLowerCase()));
  const gbifInvasive = means.has("invasive");
  const introduced = means.has("introduced") || means.has("naturalised") || means.has("naturalized");

  let note: string;
  if (flagged || gbifInvasive) {
    const who = [flagged ? "Bloomprint's library" : null, gbifInvasive ? "GBIF records" : null]
      .filter(Boolean)
      .join(" and ");
    note = `Flagged as potentially invasive in some regions (${who}). Verify with your municipality or local extension before planting, and consider a safer alternative.`;
  } else if (introduced) {
    note =
      "Recorded as introduced (non-native) in parts of its range — not flagged invasive in Bloomprint's library, but regional rules vary, so verify locally.";
  } else if (means.has("native")) {
    note =
      "Recorded as native in parts of its range. Regional rules still vary — verify locally if unsure.";
  } else {
    note = "No invasive flag in Bloomprint's library. Regional rules still vary — verify locally if unsure.";
  }

  return {
    scientificName,
    commonName,
    flagged,
    note,
    source: invasiveSource(lastCheckedAt, establishmentMeans.length > 0),
    lastCheckedAt,
  };
}

export async function getInvasiveRisk(
  scientificName: string,
  flagged: boolean,
  commonName?: string,
  plantId?: string,
): Promise<CachedLiveData<InvasiveRisk> | null> {
  const key = `invasive:${scientificName.toLowerCase()}:${flagged ? "1" : "0"}`;
  const cached = getCached<InvasiveRisk>(key);
  if (cached) return cached;

  // Known library plant → prefetched GBIF data (zero network). Unknown → one cached live lookup.
  let establishmentMeans = getPrefetchedPlantData(plantId)?.establishmentMeans ?? null;
  if (establishmentMeans === null) {
    const live = await gbifPlantData(scientificName);
    establishmentMeans = live?.establishmentMeans ?? [];
  }

  const risk = buildInvasiveRisk(scientificName, flagged, commonName, establishmentMeans);
  return setCached(key, risk, getCachePolicy("invasive"), risk.source);
}
