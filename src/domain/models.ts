/**
 * Bloomprint domain models — the source of truth.
 *
 * Every entity is a Zod schema with an inferred TypeScript type. This layer is framework-free
 * (no React/Next imports) so the planning engine stays pure and testable. See docs/SPEC.md §7.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Shared value types                                                  */
/* ------------------------------------------------------------------ */

/** A price/cost is always a range, never an exact claim (docs/DECISIONS.md D7). */
export const MoneyRange = z.object({
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
});
export type MoneyRange = z.infer<typeof MoneyRange>;

/** Confidence-bearing values use "unknown" rather than forcing a guess. */
export const Tri = z.enum(["yes", "no", "unknown"]);
export type Tri = z.infer<typeof Tri>;

export const SunExposure = z.enum(["full-sun", "part-sun", "shade", "unknown"]);
export type SunExposure = z.infer<typeof SunExposure>;

export const SoilType = z.enum(["clay", "loam", "sandy", "unknown"]);
export type SoilType = z.infer<typeof SoilType>;

export const Drainage = z.enum(["well-drained", "average", "poor", "unknown"]);
export type Drainage = z.infer<typeof Drainage>;

export const Pressure = z.enum(["none", "low", "high", "unknown"]);
export type Pressure = z.infer<typeof Pressure>;

export const MaintenanceLevel = z.enum(["low", "medium", "high"]);
export type MaintenanceLevel = z.infer<typeof MaintenanceLevel>;

export const EffortLevel = z.enum(["light", "moderate", "heavy", "hire-help"]);
export type EffortLevel = z.infer<typeof EffortLevel>;

export const BudgetStyle = z.enum(["budget", "balanced", "premium"]);
export type BudgetStyle = z.infer<typeof BudgetStyle>;

export const ExperienceLevel = z.enum(["beginner", "intermediate", "experienced"]);
export type ExperienceLevel = z.infer<typeof ExperienceLevel>;

/** What the user is trying to solve. UI shows problem language; this is the internal enum. */
export const ProjectGoal = z.enum([
  "privacy", // "block the neighbors' view"
  "curb-appeal", // "make the front of my home look better"
  "low-maintenance", // "something easy to maintain"
  "pollinator", // "attract bees and butterflies"
  "shade-tolerant", // "fill a shady spot"
  "general", // "just give me a good plan"
]);
export type ProjectGoal = z.infer<typeof ProjectGoal>;

/** Where in the yard the project lives — drives the no-photo layout template. */
export const AreaType = z.enum([
  "foundation-bed",
  "driveway-edge",
  "front-walkway",
  "fence-line",
  "patio-edge",
  "lawn-corner",
]);
export type AreaType = z.infer<typeof AreaType>;

export const StyleFamily = z.enum([
  "modern-minimal",
  "warm-cottage",
  "clean-japanese",
  "layered-pollinator",
  "soft-prairie",
]);
export type StyleFamily = z.infer<typeof StyleFamily>;

export const PlantRole = z.enum(["structure", "mid", "front", "accent", "screen"]);
export type PlantRole = z.infer<typeof PlantRole>;

export const PlantType = z.enum([
  "evergreen",
  "shrub",
  "perennial",
  "grass",
  "tree",
  "groundcover",
]);
export type PlantType = z.infer<typeof PlantType>;

export const WaterNeed = z.enum(["low", "medium", "high"]);
export type WaterNeed = z.infer<typeof WaterNeed>;

export const MaterialCategory = z.enum([
  "mulch",
  "stone",
  "edging",
  "soil",
  "lighting",
  "fabric",
]);
export type MaterialCategory = z.infer<typeof MaterialCategory>;

export const ShoppingPriority = z.enum(["buy-first", "can-wait", "optional"]);
export type ShoppingPriority = z.infer<typeof ShoppingPriority>;

export const RiskSeverity = z.enum(["low", "medium", "high"]);
export type RiskSeverity = z.infer<typeof RiskSeverity>;

/** How sure we are a plan is correct; surfaced as a sentence + ✓/⚠ reasons in the UI. */
export const ConfidenceLevel = z.enum(["low", "medium", "good", "high"]);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevel>;

export const PlanLabel = z.enum([
  "buildable-estimate",
  "concept-placement",
  "needs-local-verification",
]);
export type PlanLabel = z.infer<typeof PlanLabel>;

/* ------------------------------------------------------------------ */
/* Evidence & catalog records                                          */
/* ------------------------------------------------------------------ */

/** A pointer to where a fact came from — keeps the engine honest. */
export const EvidenceRef = z.object({
  source: z.string(),
  note: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRef>;

export const PlantRecord = z.object({
  id: z.string(),
  commonName: z.string(),
  botanicalName: z.string(),
  type: PlantType,
  roles: z.array(PlantRole).min(1),
  sun: z.array(SunExposure).min(1),
  water: WaterNeed,
  hardinessMin: z.number().int(),
  hardinessMax: z.number().int(),
  matureHeightCm: z.number().positive(),
  matureWidthCm: z.number().positive(),
  spacingCm: z.number().positive(),
  maintenance: MaintenanceLevel,
  saltTolerant: z.boolean(),
  deerResistant: z.boolean(),
  toxicToPetsOrKids: z.boolean(),
  invasive: z.boolean(),
  unitPrice: MoneyRange,
  styles: z.array(StyleFamily).min(1),
  seasonInterest: z.string(),
  evidence: z.array(EvidenceRef).default([]),
});
export type PlantRecord = z.infer<typeof PlantRecord>;

export const MaterialItem = z.object({
  id: z.string(),
  name: z.string(),
  category: MaterialCategory,
  unit: z.string(), // "bag", "sqft", "linear-ft", "fixture"
  coveragePerUnitSqft: z.number().positive().optional(),
  unitPrice: MoneyRange,
  defaultPriority: ShoppingPriority,
});
export type MaterialItem = z.infer<typeof MaterialItem>;

export const ToolItem = z.object({
  id: z.string(),
  name: z.string(),
  neededFor: z.string(),
  optional: z.boolean().default(false),
});
export type ToolItem = z.infer<typeof ToolItem>;

export const EquipmentItem = z.object({
  id: z.string(),
  name: z.string(),
  neededWhen: z.string(),
  rentalPrice: MoneyRange,
});
export type EquipmentItem = z.infer<typeof EquipmentItem>;

export const RegionPreset = z.object({
  id: z.string(),
  label: z.string(),
  hardinessMin: z.number().int(),
  hardinessMax: z.number().int(),
  saltRisk: z.boolean(),
  deerPressure: Pressure,
  typicalSoil: SoilType,
  typicalDrainage: Drainage,
  /** Approximate best planting window for this region (advisory). */
  weatherWindow: z.string(),
  /** How much we trust this coarse match (microclimates vary). */
  confidence: ConfidenceLevel,
});
export type RegionPreset = z.infer<typeof RegionPreset>;

/* ------------------------------------------------------------------ */
/* Profiles (assistant memory — never a gate, docs/DECISIONS.md D5)    */
/* ------------------------------------------------------------------ */

export const UserProfile = z.object({
  budgetStyle: BudgetStyle.optional(),
  effortLevel: EffortLevel.optional(),
  experience: ExperienceLevel.optional(),
  maintenanceTolerance: MaintenanceLevel.optional(),
  ownedTools: z.array(z.string()).optional(),
  helpers: z.number().int().nonnegative().optional(),
  hasPetsOrKids: z.boolean().optional(),
  preferredRetailers: z.array(z.string()).optional(),
  designTaste: z.array(StyleFamily).optional(),
  isGardenStaff: z.boolean().optional(),
});
export type UserProfile = z.infer<typeof UserProfile>;

export const PropertyProfile = z.object({
  homeType: z.string().optional(),
  regionId: z.string().optional(),
  yardSizeSqft: z.number().positive().optional(),
  soil: SoilType.optional(),
  drainage: Drainage.optional(),
  roadSalt: Tri.optional(),
  deerPressure: Pressure.optional(),
  bylawConcerns: z.boolean().optional(),
});
export type PropertyProfile = z.infer<typeof PropertyProfile>;

/* ------------------------------------------------------------------ */
/* Intake & resolved site                                              */
/* ------------------------------------------------------------------ */

/** Minimal first-plan input. Everything beyond goal/region is optional ("unknown" tolerant). */
export const YardIntake = z.object({
  regionId: z.string(),
  goal: ProjectGoal,
  budget: z.number().positive().optional(),
  budgetStyle: BudgetStyle.optional(),
  effortLevel: EffortLevel.default("moderate"),
  areaType: AreaType.optional(),
  areaSqft: z.number().positive().optional(),
  hasPhoto: z.boolean().default(false),
  // Optional "accuracy upgrade" answers:
  sun: SunExposure.default("unknown"),
  soil: SoilType.default("unknown"),
  drainage: Drainage.default("unknown"),
  hasPetsOrKids: z.boolean().optional(),
  ownedTools: z.array(z.string()).optional(),
  helpers: z.number().int().nonnegative().optional(),
  stylePreference: StyleFamily.optional(),
});
export type YardIntake = z.infer<typeof YardIntake>;

/** Intake + region defaults merged into the conditions the engine actually reasons over. */
export const SiteCondition = z.object({
  regionId: z.string(),
  hardinessMin: z.number().int(),
  hardinessMax: z.number().int(),
  sun: SunExposure,
  soil: SoilType,
  drainage: Drainage,
  saltExposure: Tri,
  deerPressure: Pressure,
  areaType: AreaType,
  areaSqft: z.number().positive(),
  /** Fields we had to assume because the user didn't supply them. */
  assumptions: z.array(z.string()).default([]),
});
export type SiteCondition = z.infer<typeof SiteCondition>;

/* ------------------------------------------------------------------ */
/* Plan parts                                                          */
/* ------------------------------------------------------------------ */

export const PlantFitScore = z.object({
  plantId: z.string(),
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()),
  warnings: z.array(z.string()).default([]),
});
export type PlantFitScore = z.infer<typeof PlantFitScore>;

export const PlantPlacement = z.object({
  plantId: z.string(),
  commonName: z.string(),
  role: PlantRole,
  quantity: z.number().int().positive(),
  spacingNote: z.string(),
  unitPrice: MoneyRange,
  lineTotal: MoneyRange,
  fit: PlantFitScore,
  // Curated display facts (so the UI needn't import the engine):
  type: PlantType,
  matureSize: z.string(),
  sunLabel: z.string(),
  maintenance: MaintenanceLevel,
});
export type PlantPlacement = z.infer<typeof PlantPlacement>;

export const ShoppingItem = z.object({
  name: z.string(),
  category: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  price: MoneyRange,
  priority: ShoppingPriority,
});
export type ShoppingItem = z.infer<typeof ShoppingItem>;

export const InstallPhase = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  estHours: z.number().nonnegative(),
  tools: z.array(z.string()).default([]),
});
export type InstallPhase = z.infer<typeof InstallPhase>;

export const RiskWarning = z.object({
  id: z.string(),
  severity: RiskSeverity,
  message: z.string(),
  mitigation: z.string(),
});
export type RiskWarning = z.infer<typeof RiskWarning>;

export const LaborEstimate = z.object({
  totalHours: z.number().nonnegative(),
  people: z.number().int().positive(),
  weekends: z.number().positive(),
});
export type LaborEstimate = z.infer<typeof LaborEstimate>;

export const BudgetBreakdown = z.object({
  byCategory: z.array(z.object({ category: z.string(), price: MoneyRange })),
  diyTotal: MoneyRange,
});
export type BudgetBreakdown = z.infer<typeof BudgetBreakdown>;

export const PlanScores = z.object({
  planFit: z.number().min(0).max(1),
  feasibility: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});
export type PlanScores = z.infer<typeof PlanScores>;

/** A reason shown next to the confidence sentence: ✓ (good) or ⚠ (caveat). */
export const ConfidenceReason = z.object({
  kind: z.enum(["good", "caveat"]),
  text: z.string(),
});
export type ConfidenceReason = z.infer<typeof ConfidenceReason>;

/** Detail offered by the Accuracy Upgrade Card — answering it raises confidence. */
export const AccuracyUpgrade = z.object({
  field: z.enum(["sun", "soil", "drainage", "tools", "helpers"]),
  question: z.string(),
});
export type AccuracyUpgrade = z.infer<typeof AccuracyUpgrade>;

/** Before → after framing so users *feel* the transformation, not just read a list. */
export const Transformation = z.object({
  current: z.string(),
  planned: z.string(),
  feeling: z.string(),
});
export type Transformation = z.infer<typeof Transformation>;

/** The visual-summary "hero moment" shown before logistics. */
export const VisualSummary = z.object({
  styleLabel: z.string(),
  moodChips: z.array(z.string()),
  whatChangesVisually: z.array(z.string()),
  expectedEffort: z.string(),
  transformation: Transformation,
});
export type VisualSummary = z.infer<typeof VisualSummary>;

/** Practical, deterministic notes for garden-center staff (works without AI). */
export const StaffNotes = z.object({
  customerUnderestimates: z.array(z.string()),
  substitutions: z.array(z.string()),
  upsells: z.array(z.string()),
});
export type StaffNotes = z.infer<typeof StaffNotes>;

/** Phase 4 (deferred) concept-board placement. Defined now so the type is stable. */
export const VisualPlacement = z.object({
  plantId: z.string(),
  x: z.number(),
  y: z.number(),
  scale: z.number().positive().default(1),
  rotation: z.number().default(0),
});
export type VisualPlacement = z.infer<typeof VisualPlacement>;

/* ------------------------------------------------------------------ */
/* The deterministic plan (source of truth)                            */
/* ------------------------------------------------------------------ */

export const DeterministicPlan = z.object({
  intake: YardIntake,
  site: SiteCondition,
  style: StyleFamily,
  styleLabel: z.string(),
  /** The standout, "that's smart" observation. Required — never generic slop. */
  insight: z.string(),
  /** Warm, human-readable summary that reads well even with no AI. */
  narrative: z.string(),
  visualSummary: VisualSummary,
  plants: z.array(PlantPlacement),
  shoppingList: z.array(ShoppingItem),
  tools: z.array(ToolItem),
  equipment: z.array(EquipmentItem),
  budget: BudgetBreakdown,
  labor: LaborEstimate,
  installPhases: z.array(InstallPhase),
  risks: z.array(RiskWarning),
  topActions: z.array(z.string()),
  bestWeatherWindow: z.string(),
  staff: StaffNotes,
  scores: PlanScores,
  confidence: ConfidenceLevel,
  confidenceSentence: z.string(),
  confidenceReasons: z.array(ConfidenceReason),
  accuracyUpgrades: z.array(AccuracyUpgrade),
  planLabel: PlanLabel,
});
export type DeterministicPlan = z.infer<typeof DeterministicPlan>;

/* ------------------------------------------------------------------ */
/* AI enhancement (presentation only — facts stay locked, D2)          */
/* ------------------------------------------------------------------ */

export const AIPlanEnhancement = z.object({
  conceptName: z.string().optional(),
  homeownerExplanation: z.string().optional(),
  refinedNarrative: z.string().optional(),
  staffTalkingPoints: z.array(z.string()).optional(),
  alternatives: z.array(z.string()).optional(),
  imagePrompt: z.string().optional(),
  whyNot: z.array(z.string()).optional(),
  simplifiedSummary: z.string().optional(),
});
export type AIPlanEnhancement = z.infer<typeof AIPlanEnhancement>;

export const PlanProvider = z.enum(["mock", "claude", "none"]);
export type PlanProvider = z.infer<typeof PlanProvider>;

/** The full plan returned to the UI: deterministic truth + optional presentation layer. */
export const BloomprintPlan = z.object({
  plan: DeterministicPlan,
  enhancement: AIPlanEnhancement.nullable(),
  enhancedBy: PlanProvider,
  generatedAt: z.string(),
});
export type BloomprintPlan = z.infer<typeof BloomprintPlan>;

/* ------------------------------------------------------------------ */
/* Refinement (Draft 1 → iterate via constrained chips, D4)            */
/* ------------------------------------------------------------------ */

export const RefinementAdjustment = z.enum([
  "easier",
  "cheaper",
  "more-flowers",
  "dog-safe",
  "less-watering",
  "more-privacy",
  "more-modern",
  "more-colorful",
  "salt-safe",
  "more-shade",
  "wildlife-friendly",
  "better-winter",
  "premium-look",
  "less-trimming",
  "better-resale",
]);
export type RefinementAdjustment = z.infer<typeof RefinementAdjustment>;
