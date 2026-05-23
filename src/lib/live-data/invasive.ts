/**
 * Invasive / ecological caution — a WARNING layer, never a legal claim.
 *
 * The `flagged` boolean is the LOCKED Core Library `invasive` flag passed in by the
 * caller; this module only adds honest regional wording (GBIF/EDDMapS-style context).
 * A real GBIF/invasive-checklist adapter drops in behind `LIVE_DATA_PROVIDER=gbif`.
 */
import { getCached, setCached } from "@/lib/live-data/cache";
import { getCachePolicy } from "@/lib/live-data/cachePolicy";
import type { InvasiveRisk } from "@/lib/live-data/schema";
import type { CachedLiveData } from "@/lib/live-data/types";
import type { SourceRef } from "@/domain/models";

function invasiveSource(retrievedAt: string): SourceRef {
  return {
    name: "Invasive-species context",
    sourceName: "Bloomprint library + regional references",
    sourceType: "extension-botanical",
    level: 4,
    retrievedAt,
    supports: ["regional caution only, not a legal determination"],
    confidence: "medium",
    cacheStatus: "disabled",
    sourceQuality: "Extension / botanical",
    needsLocalVerification: true,
  };
}

function mockInvasive(scientificName: string, flagged: boolean, commonName?: string): InvasiveRisk {
  const lastCheckedAt = new Date().toISOString();
  return {
    scientificName,
    commonName,
    flagged,
    note: flagged
      ? "Flagged as potentially invasive in some regions. Verify with your municipality or local extension before planting, and consider a safer alternative."
      : "No invasive flag in Bloomprint's library. Regional rules still vary — verify locally if unsure.",
    source: invasiveSource(lastCheckedAt),
    lastCheckedAt,
  };
}

export async function getInvasiveRisk(
  scientificName: string,
  flagged: boolean,
  commonName?: string,
): Promise<CachedLiveData<InvasiveRisk> | null> {
  const key = `invasive:${scientificName.toLowerCase()}:${flagged ? "1" : "0"}`;
  const cached = getCached<InvasiveRisk>(key);
  if (cached) return cached;
  if (process.env.LIVE_DATA_PROVIDER === "gbif") return null;
  return setCached(key, mockInvasive(scientificName, flagged, commonName), getCachePolicy("invasive"), invasiveSource(new Date().toISOString()));
}
