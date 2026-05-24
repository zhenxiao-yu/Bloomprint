/**
 * Scoring — deterministic, explainable, normalized 0–1 (docs/SPEC.md §8).
 * Scores rank and validate; they never decorate the UI. Each carries human-readable reasons.
 */
import type {
  BudgetBreakdown,
  ConfidenceLevel,
  LaborEstimate,
  PlantFitScore,
  PlantPlacement,
  PlantRecord,
  SiteCondition,
  StyleFamily,
  YardIntake,
} from "@/domain/models";
import { PLANTS } from "@/domain/data";
import { type Tuning, waterAtMost } from "@/domain/tuning";

export interface ScoredPlant {
  plant: PlantRecord;
  fit: PlantFitScore;
}

const W = {
  hardiness: 0.25,
  sun: 0.2,
  salt: 0.1,
  deer: 0.1,
  pets: 0.1,
  style: 0.1,
  maintenance: 0.075,
  water: 0.075,
} as const;

/** Hedging that wants regular shearing — down-weighted by the "Less trimming" chip. */
const HIGH_TRIM_IDS = new Set(["emerald-cedar", "green-velvet-boxwood", "hicks-yew"]);

export function scorePlantFit(
  plant: PlantRecord,
  site: SiteCondition,
  intake: YardIntake,
  style: StyleFamily,
  tuning: Tuning,
): PlantFitScore {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Hardiness — can it survive the region's cold?
  let hardiness: number;
  if (plant.hardinessMin <= site.hardinessMin) {
    hardiness = 1;
  } else if (plant.hardinessMin <= site.hardinessMax) {
    hardiness = 0.5;
    warnings.push("May be borderline hardy here in a cold winter.");
  } else {
    hardiness = 0;
    warnings.push("Likely too tender for this region's winters.");
  }

  // Sun
  let sun: number;
  if (site.sun === "unknown") {
    sun = 0.7;
  } else if (plant.sun.includes(site.sun)) {
    sun = 1;
    reasons.push(`Suited to ${site.sun.replace("-", " ")}.`);
  } else {
    sun = 0.3;
    warnings.push(`Prefers different light than this ${site.sun.replace("-", " ")} spot.`);
  }

  // Salt
  let salt = 1;
  if (site.saltExposure === "yes") {
    if (plant.saltTolerant) {
      salt = 1;
      reasons.push("Tolerates road salt.");
    } else {
      salt = 0.4;
      warnings.push("Sensitive to road salt — keep back from the curb/driveway.");
    }
  }

  // Deer
  let deer = 1;
  if (site.deerPressure === "high") {
    if (plant.deerResistant) {
      deer = 1;
      reasons.push("Deer tend to leave it alone.");
    } else {
      deer = 0.5;
      warnings.push("Deer may browse it where pressure is high.");
    }
  }

  // Pets/kids
  let pets = 1;
  if (intake.hasPetsOrKids && plant.toxicToPetsOrKids) {
    pets = 0.3;
    warnings.push("Toxic if chewed — site away from pets/kids or substitute.");
  }

  // Style
  let styleFit = 0.6;
  if (plant.styles.includes(style)) {
    styleFit = 1;
  }

  // Maintenance vs low-maintenance goal
  let maintenance = 0.8;
  if (intake.goal === "low-maintenance") {
    maintenance = plant.maintenance === "low" ? 1 : plant.maintenance === "medium" ? 0.6 : 0.3;
    if (plant.maintenance === "low") reasons.push("Very low maintenance.");
  }

  // Water vs drainage
  let water = 1;
  if (site.drainage === "poor" && plant.water === "low") {
    water = 0.6;
    warnings.push("Dislikes wet feet — this spot drains poorly.");
  }

  let score =
    hardiness * W.hardiness +
    sun * W.sun +
    salt * W.salt +
    deer * W.deer +
    pets * W.pets +
    styleFit * W.style +
    maintenance * W.maintenance +
    water * W.water;

  // Gentle tuning nudges (preferences, not facts)
  if (tuning.flowerBias && plant.type === "perennial") score += 0.05;
  if (tuning.easier && plant.maintenance === "low") score += 0.05;
  if (tuning.winterInterest && (plant.type === "evergreen" || plant.type === "grass" || plant.id === "red-twig-dogwood"))
    score += 0.06;
  if (tuning.lowTrim && HIGH_TRIM_IDS.has(plant.id)) score -= 0.12;

  score = Math.max(0, Math.min(1, score));

  return { plantId: plant.id, score: Number(score.toFixed(3)), reasons, warnings };
}

export function selectPlantCandidates(
  site: SiteCondition,
  intake: YardIntake,
  style: StyleFamily,
  tuning: Tuning,
): ScoredPlant[] {
  const wantsShade = intake.goal === "shade-tolerant" || tuning.shadeOnly;
  const pool = PLANTS.filter((p) => {
    if (tuning.dogSafe && p.toxicToPetsOrKids) return false;
    if (tuning.maxWater && !waterAtMost(p.water, tuning.maxWater)) return false;
    if (tuning.saltSafe && !p.saltTolerant) return false;
    if (p.hardinessMin > site.hardinessMax) return false; // can't survive winters
    if (wantsShade && !p.sun.some((s) => s === "shade" || s === "part-sun")) return false;
    return true;
  });

  const scored = pool.map((plant) => ({
    plant,
    fit: scorePlantFit(plant, site, intake, style, tuning),
  }));

  scored.sort((a, b) => {
    if (b.fit.score !== a.fit.score) return b.fit.score - a.fit.score;
    if (tuning.cheaper) return a.plant.unitPrice.min - b.plant.unitPrice.min;
    return a.plant.commonName.localeCompare(b.plant.commonName);
  });

  return scored;
}

export interface ConfidenceResult {
  value: number;
  level: ConfidenceLevel;
  sentence: string;
}

export function scoreConfidence(
  intake: YardIntake,
  regionRecognized: boolean,
  regionConfidence: ConfidenceLevel,
  zonePrecision: "good" | "medium" | null = null,
): ConfidenceResult {
  let v = 0.5;
  if (intake.sun !== "unknown") v += 0.15;
  if (intake.soil !== "unknown") v += 0.1;
  if (intake.drainage !== "unknown") v += 0.1;
  // A confidence-bearing measurement (e.g. a calibrated Yard Map) earns more than a typed
  // guess; a low-confidence one earns less. Plain typed area keeps the flat credit.
  if (intake.measurement) {
    const c = intake.measurement.confidence;
    v += c === "high" ? 0.1 : c === "good" ? 0.08 : c === "medium" ? 0.06 : 0.03;
  } else if (intake.areaSqft !== undefined) {
    v += 0.05;
  }
  if (regionRecognized) {
    v += regionConfidence === "high" ? 0.15 : regionConfidence === "good" ? 0.12 : regionConfidence === "medium" ? 0.1 : 0;
  }
  // A real hardiness zone from a ZIP/postal match is a meaningful accuracy gain.
  if (zonePrecision === "good") v += 0.2;
  else if (zonePrecision === "medium") v += 0.1;
  v = Math.max(0, Math.min(1, v));

  const level: ConfidenceLevel = v >= 0.85 ? "high" : v >= 0.7 ? "good" : v >= 0.5 ? "medium" : "low";
  const sentence =
    level === "high" || level === "good"
      ? "This plan should work well for your yard."
      : level === "medium"
        ? "This is a solid starting plan — a few details would sharpen it."
        : "This is a usable first draft, but some key details are still assumed.";

  return { value: Number(v.toFixed(3)), level, sentence };
}

export function scorePlanFit(placements: PlantPlacement[]): number {
  if (placements.length === 0) return 0;
  const totalQty = placements.reduce((s, p) => s + p.quantity, 0);
  const weighted = placements.reduce((s, p) => s + p.fit.score * p.quantity, 0);
  return Number((weighted / totalQty).toFixed(3));
}

export function scoreFeasibility(
  budget: BudgetBreakdown,
  labor: LaborEstimate,
  intake: YardIntake,
): number {
  let budgetFit = 0.8;
  if (intake.budget !== undefined) {
    if (budget.diyTotal.max <= intake.budget) budgetFit = 1;
    else if (intake.budget >= budget.diyTotal.min) budgetFit = 0.6;
    else budgetFit = 0.3;
  }

  let effortFit: number;
  switch (intake.effortLevel) {
    case "hire-help":
      effortFit = 1;
      break;
    case "heavy":
      effortFit = labor.weekends <= 3 ? 1 : 0.7;
      break;
    case "moderate":
      effortFit = labor.weekends <= 2 ? 1 : 0.6;
      break;
    default: // light
      effortFit = labor.weekends <= 1 ? 1 : 0.5;
  }

  return Number(((budgetFit + effortFit) / 2).toFixed(3));
}
