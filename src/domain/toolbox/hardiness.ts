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
