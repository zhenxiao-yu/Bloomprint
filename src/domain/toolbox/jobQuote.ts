/**
 * Job estimator (pro) — turns an area + service into labor hours (industry production rates),
 * a material cost band, and a quote range with margin + a $/sq-ft. Framework-free, US + Canada
 * (currency-agnostic numbers; the UI labels USD/CAD). Everything is an explicit RANGE with a
 * "planning estimate, not a quote" disclaimer — no invented exact prices.
 */
import { z } from "zod";

import { SQFT_PER_SQM, LenUnit, round1 } from "./_geometry";

export const TOOLBOX_DISCLAIMER =
  "Planning estimate, not a quote. Confirm local material prices and your own production rates.";

export const JobService = z.enum(["plantingBed", "sod", "mulch", "paverPatio", "lawnSeed", "cleanup"]);
export type JobService = z.infer<typeof JobService>;

/** Per-service planning rates: crew-hours per 100 sq ft, and material $/sq ft low–high. */
const RATES: Record<JobService, { hoursPer100: number; matLow: number; matHigh: number }> = {
  plantingBed: { hoursPer100: 3.0, matLow: 4, matHigh: 10 },
  sod: { hoursPer100: 1.5, matLow: 1.5, matHigh: 3 },
  mulch: { hoursPer100: 0.8, matLow: 0.5, matHigh: 1.2 },
  paverPatio: { hoursPer100: 8.0, matLow: 12, matHigh: 25 },
  lawnSeed: { hoursPer100: 0.5, matLow: 0.2, matHigh: 0.5 },
  cleanup: { hoursPer100: 1.2, matLow: 0, matHigh: 0.3 },
};

/** Setup/cleanup/breaks buffer on raw production hours. */
const LABOR_BUFFER = 1.15;

export const JobQuoteInput = z.object({
  unit: LenUnit.default("ft"),
  area: z.number().positive().optional(), // sq ft (unit="ft") or sq m (unit="m")
  service: JobService.default("plantingBed"),
  crewRate: z.number().positive().max(500).default(65), // $/hr, all-in crew
  marginPct: z.number().min(0).max(200).default(30),
});
export type JobQuoteInput = z.infer<typeof JobQuoteInput>;

export interface JobQuoteResult {
  areaSqft: number;
  hours: number;
  laborCost: number;
  material: { low: number; high: number };
  price: { low: number; high: number };
  perSqft: { low: number; high: number };
}

export function computeJobQuote(raw: z.input<typeof JobQuoteInput>): JobQuoteResult | null {
  const input = JobQuoteInput.parse(raw);
  if (!input.area) return null;
  const areaSqft = round1(input.unit === "m" ? input.area * SQFT_PER_SQM : input.area);
  if (areaSqft <= 0) return null;

  const rate = RATES[input.service];
  const hours = round1((rate.hoursPer100 * areaSqft) / 100 * LABOR_BUFFER);
  const laborCost = Math.round(hours * input.crewRate);
  const matLow = areaSqft * rate.matLow;
  const matHigh = areaSqft * rate.matHigh;
  const mult = 1 + input.marginPct / 100;
  const priceLow = Math.round((laborCost + matLow) * mult);
  const priceHigh = Math.round((laborCost + matHigh) * mult);

  return {
    areaSqft,
    hours,
    laborCost,
    material: { low: Math.round(matLow), high: Math.round(matHigh) },
    price: { low: priceLow, high: priceHigh },
    perSqft: { low: round1(priceLow / areaSqft), high: round1(priceHigh / areaSqft) },
  };
}
