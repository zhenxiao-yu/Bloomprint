/**
 * USDA hardiness-zone lookup helpers. The network call lives in the API route; this stays
 * framework-free: validate + normalize the phzmapi.org payload, and validate a US ZIP. The
 * tool degrades gracefully (manual zone entry) when the lookup is unavailable.
 */
import { z } from "zod";

/** Raw phzmapi.org/<zip>.json shape, e.g. { zone:"8a", temperature_range:"10 to 15", coordinates:{...} }. */
export const PhzmapiResponse = z.object({
  zone: z.string().min(1),
  temperature_range: z.string().optional(),
  coordinates: z.object({ lat: z.string(), lon: z.string() }).optional(),
});

export interface HardinessResult {
  /** USDA zone, e.g. "8a". */
  zone: string;
  /** Coldest average winter low, °F (parsed from the range), or null if unparseable. */
  tempLowF: number | null;
  tempHighF: number | null;
  lat: number | null;
  lon: number | null;
}

export function isValidUsZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

/** Canadian postal code (e.g. "K1A 0B1"). Used to nudge CA users to the manual zone picker. */
export function isCanadianPostal(s: string): boolean {
  return /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(s.trim());
}

/** USDA-style zones common to the US and Canada, for the manual picker. */
export const USDA_ZONES: string[] = (() => {
  const out: string[] = [];
  for (let z = 2; z <= 11; z++) {
    out.push(`${z}a`, `${z}b`);
  }
  return out;
})();

/**
 * Temperature band (°F) for a USDA zone like "8a"/"8b"/"8". Each whole zone is a 10°F band
 * starting at −60°F for zone 1; the a/b suffix splits it into 5°F halves. Pure — works offline
 * and identically for US and Canada (same zone system). Returns null for an unparseable zone.
 */
export function zoneTempRangeF(zone: string): { low: number; high: number } | null {
  const m = zone.trim().match(/^(\d{1,2})([ab])?$/i);
  if (!m) return null;
  const z = Number(m[1]);
  if (z < 1 || z > 13) return null;
  const base = -60 + (z - 1) * 10;
  const half = m[2]?.toLowerCase();
  if (half === "a") return { low: base, high: base + 5 };
  if (half === "b") return { low: base + 5, high: base + 10 };
  return { low: base, high: base + 10 };
}

/** Normalize a phzmapi payload to a clean result, or null if it doesn't match. Pure. */
export function parseHardiness(raw: unknown): HardinessResult | null {
  const p = PhzmapiResponse.safeParse(raw);
  if (!p.success) return null;
  const m = p.data.temperature_range?.match(/(-?\d+)\s*to\s*(-?\d+)/);
  const lat = p.data.coordinates ? Number(p.data.coordinates.lat) : NaN;
  const lon = p.data.coordinates ? Number(p.data.coordinates.lon) : NaN;
  return {
    zone: p.data.zone.trim(),
    tempLowF: m ? Number(m[1]) : null,
    tempHighF: m ? Number(m[2]) : null,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
  };
}
