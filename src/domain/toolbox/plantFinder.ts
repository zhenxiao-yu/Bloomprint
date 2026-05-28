/**
 * Plant Finder — filter + rank the Bloomprint Core Library by real growing conditions. This is
 * NOT a generic calculator: it queries the curated catalog (sun, water, hardiness, toxicity,
 * deer/salt tolerance, invasive status) and returns honest matches with reasons + cautions.
 * Framework-free, deterministic, offline. Facts come from the catalog — never invented.
 */
import { z } from "zod";

import { PLANTS } from "@/domain/data/plants";
import type { PlantRecord } from "@/domain/models";

export const SunFilter = z.enum(["any", "full-sun", "part-sun", "shade"]);
export type SunFilter = z.infer<typeof SunFilter>;

export const WaterFilter = z.enum(["any", "low", "medium", "high"]);
export type WaterFilter = z.infer<typeof WaterFilter>;

export const TypeFilter = z.enum([
  "any",
  "evergreen",
  "shrub",
  "perennial",
  "grass",
  "tree",
  "groundcover",
]);
export type TypeFilter = z.infer<typeof TypeFilter>;

export const PlantFinderInput = z.object({
  zone: z.number().int().min(1).max(13).optional(),
  sun: SunFilter.default("any"),
  water: WaterFilter.default("any"),
  type: TypeFilter.default("any"),
  petSafe: z.boolean().default(false),
  deerResistant: z.boolean().default(false),
  saltTolerant: z.boolean().default(false),
  excludeInvasive: z.boolean().default(true),
  limit: z.number().int().positive().max(48).default(12),
});
export type PlantFinderInput = z.infer<typeof PlantFinderInput>;

export interface PlantMatch {
  id: string;
  commonName: string;
  botanicalName: string;
  type: PlantRecord["type"];
  sun: PlantRecord["sun"];
  water: PlantRecord["water"];
  hardinessMin: number;
  hardinessMax: number;
  matureHeightCm: number;
  matureWidthCm: number;
  spacingCm: number;
  maintenance: PlantRecord["maintenance"];
  unitPrice: PlantRecord["unitPrice"];
  toxicToPetsOrKids: boolean;
  invasive: boolean;
  deerResistant: boolean;
  saltTolerant: boolean;
  /** Which of the user's conditions this plant satisfies (codes the UI localizes). */
  matchedZone: boolean;
  matchedSun: boolean;
  matchedWater: boolean;
}

export interface PlantFinderResult {
  matches: PlantMatch[];
  /** Total matches before the display limit (so the UI can say "showing N of M"). */
  total: number;
}

const MAINT_RANK: Record<PlantRecord["maintenance"], number> = { low: 2, medium: 1, high: 0 };

function passesSun(plant: PlantRecord, sun: SunFilter): boolean {
  if (sun === "any") return true;
  return plant.sun.includes(sun as PlantRecord["sun"][number]);
}

/**
 * Returns catalog plants that satisfy ALL hard filters, ranked by ease of care + resilience.
 * Always returns a result (possibly empty) — never invents a plant or a fact.
 */
export function findPlants(raw: z.input<typeof PlantFinderInput>): PlantFinderResult {
  const input = PlantFinderInput.parse(raw);

  const hits = PLANTS.filter((p) => {
    if (input.zone !== undefined && (input.zone < p.hardinessMin || input.zone > p.hardinessMax)) return false;
    if (!passesSun(p, input.sun)) return false;
    if (input.water !== "any" && p.water !== input.water) return false;
    if (input.type !== "any" && p.type !== input.type) return false;
    if (input.petSafe && p.toxicToPetsOrKids) return false;
    if (input.deerResistant && !p.deerResistant) return false;
    if (input.saltTolerant && !p.saltTolerant) return false;
    if (input.excludeInvasive && p.invasive) return false;
    return true;
  });

  // Rank: easier care + resilience first, then cheaper, then name (stable).
  const ranked = [...hits].sort((a, b) => {
    const score = (p: PlantRecord) =>
      MAINT_RANK[p.maintenance] + (p.deerResistant ? 1 : 0) + (p.saltTolerant ? 1 : 0);
    const d = score(b) - score(a);
    if (d !== 0) return d;
    const price = a.unitPrice.min - b.unitPrice.min;
    if (price !== 0) return price;
    return a.commonName.localeCompare(b.commonName);
  });

  const matches: PlantMatch[] = ranked.slice(0, input.limit).map((p) => ({
    id: p.id,
    commonName: p.commonName,
    botanicalName: p.botanicalName,
    type: p.type,
    sun: p.sun,
    water: p.water,
    hardinessMin: p.hardinessMin,
    hardinessMax: p.hardinessMax,
    matureHeightCm: p.matureHeightCm,
    matureWidthCm: p.matureWidthCm,
    spacingCm: p.spacingCm,
    maintenance: p.maintenance,
    unitPrice: p.unitPrice,
    toxicToPetsOrKids: p.toxicToPetsOrKids,
    invasive: p.invasive,
    deerResistant: p.deerResistant,
    saltTolerant: p.saltTolerant,
    matchedZone: input.zone !== undefined,
    matchedSun: input.sun !== "any",
    matchedWater: input.water !== "any",
  }));

  return { matches, total: hits.length };
}
