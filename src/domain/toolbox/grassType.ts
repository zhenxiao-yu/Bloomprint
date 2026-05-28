/**
 * Grass-type selector — recommends turf species from climate region, sun, foot traffic, and a
 * low-water priority. Framework-free, offline, decision-scored (not a one-multiply). Covers the
 * cool-season North (most of Canada + northern US) and warm-season South. Returns a ranked
 * shortlist with traits the UI localizes.
 */
import { z } from "zod";

export const TOOLBOX_DISCLAIMER =
  "A starting shortlist — confirm cultivars and seed/sod availability with a local supplier.";

export const GrassRegion = z.enum(["cool", "transition", "warm"]);
export type GrassRegion = z.infer<typeof GrassRegion>;
export const GrassSun = z.enum(["full", "part", "shade"]);
export type GrassSun = z.infer<typeof GrassSun>;
export const GrassTraffic = z.enum(["low", "medium", "high"]);
export type GrassTraffic = z.infer<typeof GrassTraffic>;

interface GrassSpec {
  key: string;
  season: "cool" | "warm";
  sun: GrassSun[]; // tolerated
  traffic: GrassTraffic[]; // handles up to
  lowWater: boolean;
}

const GRASSES: GrassSpec[] = [
  { key: "tallFescue", season: "cool", sun: ["full", "part", "shade"], traffic: ["low", "medium", "high"], lowWater: true },
  { key: "kentuckyBluegrass", season: "cool", sun: ["full", "part"], traffic: ["low", "medium", "high"], lowWater: false },
  { key: "perennialRye", season: "cool", sun: ["full", "part"], traffic: ["low", "medium", "high"], lowWater: false },
  { key: "fineFescue", season: "cool", sun: ["part", "shade"], traffic: ["low"], lowWater: true },
  { key: "bermuda", season: "warm", sun: ["full"], traffic: ["low", "medium", "high"], lowWater: true },
  { key: "zoysia", season: "warm", sun: ["full", "part"], traffic: ["low", "medium", "high"], lowWater: true },
  { key: "stAugustine", season: "warm", sun: ["full", "part", "shade"], traffic: ["low", "medium"], lowWater: false },
  { key: "centipede", season: "warm", sun: ["full", "part"], traffic: ["low"], lowWater: true },
];

export const GrassTypeInput = z.object({
  region: GrassRegion.default("cool"),
  sun: GrassSun.default("full"),
  traffic: GrassTraffic.default("medium"),
  lowWater: z.boolean().default(false),
});
export type GrassTypeInput = z.infer<typeof GrassTypeInput>;

export interface GrassMatch {
  key: string;
  season: "cool" | "warm";
  score: number;
  toleratesSun: boolean;
  toleratesTraffic: boolean;
  lowWater: boolean;
}
export interface GrassTypeResult {
  matches: GrassMatch[];
}

const TRAFFIC_RANK: Record<GrassTraffic, number> = { low: 0, medium: 1, high: 2 };

export function recommendGrass(raw: z.input<typeof GrassTypeInput>): GrassTypeResult {
  const input = GrassTypeInput.parse(raw);
  // Transition zone can use either season; otherwise match the region's season.
  const seasons: Array<"cool" | "warm"> =
    input.region === "transition" ? ["cool", "warm"] : input.region === "warm" ? ["warm"] : ["cool"];

  const matches = GRASSES.filter((g) => seasons.includes(g.season))
    .map((g) => {
      const toleratesSun = g.sun.includes(input.sun);
      const toleratesTraffic = TRAFFIC_RANK[input.traffic] <= Math.max(...g.traffic.map((x) => TRAFFIC_RANK[x]));
      let score = 0;
      if (toleratesSun) score += 3;
      if (toleratesTraffic) score += 2;
      if (input.lowWater && g.lowWater) score += 2;
      return { key: g.key, season: g.season, score, toleratesSun, toleratesTraffic, lowWater: g.lowWater };
    })
    // Only keep species that at least tolerate the sun; rank best first.
    .filter((m) => m.toleratesSun)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  return { matches };
}
