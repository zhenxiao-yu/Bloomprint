/**
 * Seed-starting schedule — from a last-spring-frost date, work out indoor-sow, transplant, and
 * direct-sow dates for common crops using weeks-relative-to-frost rules. Framework-free + offline
 * (the user supplies their frost date; no API). Dates are returned as {month, day} so the UI can
 * localize them. Useful across the US + Canada — frost date is the universal anchor.
 */
import { z } from "zod";

export const TOOLBOX_DISCLAIMER =
  "Timing guide based on your frost date — adjust for your microclimate and the seed packet.";

export const SeedStartingInput = z.object({
  frostMonth: z.number().int().min(1).max(12),
  frostDay: z.number().int().min(1).max(31),
});
export type SeedStartingInput = z.infer<typeof SeedStartingInput>;

/** Weeks relative to last frost (negative = before). Any phase may be omitted for a crop. */
interface CropRule {
  key: string;
  indoor?: number;
  transplant?: number;
  direct?: number;
}

// Common cool-to-warm-season crops; weeks are standard "before/after last frost" guidance.
const CROPS: CropRule[] = [
  { key: "tomato", indoor: -6, transplant: 1 },
  { key: "pepper", indoor: -8, transplant: 2 },
  { key: "lettuce", indoor: -5, transplant: -2, direct: -2 },
  { key: "cucumber", indoor: -3, transplant: 1, direct: 1 },
  { key: "squash", indoor: -3, transplant: 1, direct: 1 },
  { key: "beans", direct: 1 },
  { key: "peas", direct: -5 },
  { key: "broccoli", indoor: -6, transplant: -2 },
  { key: "kale", indoor: -6, transplant: -2, direct: -1 },
  { key: "basil", indoor: -4, transplant: 1 },
  { key: "carrots", direct: -2 },
  { key: "onion", indoor: -10, transplant: -2 },
];

export interface DateMD {
  month: number; // 1-12
  day: number; // 1-31
}
export interface CropSchedule {
  key: string;
  indoorSow?: DateMD;
  transplant?: DateMD;
  directSow?: DateMD;
}
export interface SeedStartingResult {
  crops: CropSchedule[];
}

const DAY_MS = 86_400_000;

function shift(frost: number, weeks: number): DateMD {
  const d = new Date(frost + weeks * 7 * DAY_MS);
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function computeSeedStarting(raw: z.input<typeof SeedStartingInput>): SeedStartingResult | null {
  const input = SeedStartingInput.parse(raw);
  // Reference (non-leap) year — only month/day are surfaced, so the year is irrelevant.
  const frost = Date.UTC(2025, input.frostMonth - 1, input.frostDay);
  if (Number.isNaN(frost)) return null;

  const crops: CropSchedule[] = CROPS.map((c) => ({
    key: c.key,
    indoorSow: c.indoor !== undefined ? shift(frost, c.indoor) : undefined,
    transplant: c.transplant !== undefined ? shift(frost, c.transplant) : undefined,
    directSow: c.direct !== undefined ? shift(frost, c.direct) : undefined,
  }));
  return { crops };
}

export const SEED_CROP_KEYS = CROPS.map((c) => c.key);
