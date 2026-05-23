/**
 * UI option lists — problem-language labels, plain-language questions (docs/SPEC.md §6).
 * Imports only the region presets (not the engine) to keep the client bundle lean.
 */
import type {
  AreaType,
  BudgetStyle,
  Drainage,
  EffortLevel,
  ProjectGoal,
  RefinementAdjustment,
  SoilType,
  StyleFamily,
  SunExposure,
} from "@/domain/models";
import { REGIONS } from "@/domain/data/regions";

export const GOALS: { value: ProjectGoal; label: string; blurb: string }[] = [
  { value: "privacy", label: "Block the view from neighbors", blurb: "Add a green screen for privacy." },
  { value: "curb-appeal", label: "Make the front of my home look better", blurb: "Lift your curb appeal." },
  { value: "low-maintenance", label: "Something easy to maintain", blurb: "Looks cared-for, low upkeep." },
  { value: "pollinator", label: "Attract bees and butterflies", blurb: "A garden alive with pollinators." },
  { value: "shade-tolerant", label: "Fill a shady spot", blurb: "Plants that thrive out of the sun." },
  { value: "general", label: "Just give me a good plan", blurb: "A solid all-round refresh." },
];

export const BUDGETS: { label: string; budget: number; budgetStyle: BudgetStyle }[] = [
  { label: "Under $500", budget: 450, budgetStyle: "budget" },
  { label: "$500–$1,000", budget: 900, budgetStyle: "balanced" },
  { label: "$1,000–$2,000", budget: 1800, budgetStyle: "balanced" },
  { label: "$2,000+", budget: 2500, budgetStyle: "premium" },
];

export const EFFORTS: { value: EffortLevel; label: string }[] = [
  { value: "light", label: "Light weekend work" },
  { value: "moderate", label: "Moderate DIY" },
  { value: "heavy", label: "Heavy work is okay" },
  { value: "hire-help", label: "I may hire help" },
];

export const AREAS: { value: AreaType; label: string }[] = [
  { value: "foundation-bed", label: "Along the house foundation" },
  { value: "driveway-edge", label: "Along the driveway" },
  { value: "front-walkway", label: "Front walkway" },
  { value: "fence-line", label: "Fence line / side yard" },
  { value: "patio-edge", label: "Patio edge" },
  { value: "lawn-corner", label: "Open lawn corner" },
];

export const SUN_OPTIONS: { value: SunExposure; label: string }[] = [
  { value: "full-sun", label: "Lots of sun (6+ hrs)" },
  { value: "part-sun", label: "Some sun (3–6 hrs)" },
  { value: "shade", label: "Mostly shade" },
  { value: "unknown", label: "I'm not sure" },
];

export const SOIL_OPTIONS: { value: SoilType; label: string }[] = [
  { value: "clay", label: "Heavy / clay" },
  { value: "loam", label: "Rich / loamy" },
  { value: "sandy", label: "Sandy / fast-draining" },
  { value: "unknown", label: "I'm not sure" },
];

export const DRAINAGE_OPTIONS: { value: Drainage; label: string }[] = [
  { value: "well-drained", label: "Drains quickly" },
  { value: "average", label: "Average" },
  { value: "poor", label: "Water sits after rain" },
  { value: "unknown", label: "I'm not sure" },
];

export const STYLE_OPTIONS: { value: StyleFamily; label: string }[] = [
  { value: "modern-minimal", label: "Modern minimal" },
  { value: "warm-cottage", label: "Warm cottage" },
  { value: "clean-japanese", label: "Clean Japanese" },
  { value: "layered-pollinator", label: "Layered pollinator" },
  { value: "soft-prairie", label: "Soft prairie" },
];

/** Number of extra helpers beyond the homeowner (feeds the labor estimate). */
export const HELPER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Just me" },
  { value: 1, label: "Me + 1 helper" },
  { value: 2, label: "A few of us (2+)" },
];

export const REGION_OPTIONS = REGIONS.map((r) => ({ value: r.id, label: r.label }));

export const REFINEMENTS: { value: RefinementAdjustment; label: string }[] = [
  { value: "cheaper", label: "Lower the budget" },
  { value: "easier", label: "Make this easier" },
  { value: "less-trimming", label: "Less trimming" },
  { value: "more-flowers", label: "Add more flowers" },
  { value: "more-colorful", label: "More colorful" },
  { value: "more-privacy", label: "More privacy" },
  { value: "more-shade", label: "More shade-friendly" },
  { value: "more-modern", label: "More modern" },
  { value: "premium-look", label: "Looks more premium" },
  { value: "better-resale", label: "Better for resale" },
  { value: "better-winter", label: "Better in winter" },
  { value: "wildlife-friendly", label: "More wildlife friendly" },
  { value: "dog-safe", label: "Safer for dogs" },
  { value: "salt-safe", label: "Salt-tolerant" },
  { value: "less-watering", label: "Less watering" },
  { value: "stone-to-mulch", label: "Stone → mulch" },
];
