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

/**
 * A region-aware price estimate. Wraps {@link MoneyRange} so the engine can carry a currency
 * and an explicit "this is never an exact/checkout price" guarantee on new surfaces (tiers,
 * region store output) without disturbing the many records that use the bare {@link MoneyRange}.
 */
export const PriceBand = z.object({
  range: MoneyRange,
  currency: z.enum(["USD", "CAD"]).default("CAD"),
  /** Bloomprint never claims an exact/final price — this is structurally pinned to false. */
  isExactPrice: z.literal(false).default(false),
});
export type PriceBand = z.infer<typeof PriceBand>;

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

/**
 * How big a bite the user wants to take. `section_plan` is the historical default (a single
 * bed/area), so it is the default everywhere to keep existing behavior unchanged.
 */
export const ProjectScope = z.enum(["spot_fix", "section_plan", "whole_area_plan"]);
export type ProjectScope = z.infer<typeof ProjectScope>;

/**
 * Problem-language entry point (CLAUDE.md UX principle). Optional and additive: it only
 * *pre-fills* the user's {@link ProjectGoal} in the UI (see domain/problem) — the engine still
 * reasons over `goal`, never over `problemType`.
 */
export const ProblemType = z.enum([
  "dead_plants",
  "empty_bed",
  "overgrown",
  "privacy_gap",
  "muddy_erosion",
  "boring_curb",
  "too_much_upkeep",
  "shady_bare_spot",
]);
export type ProblemType = z.infer<typeof ProblemType>;

/** How the user told us about the space. Derived (not stored) — see domain/problem. */
export const InputCaptureType = z.enum(["photo", "manual_dimensions", "no_photo", "ar_scan"]);
export type InputCaptureType = z.infer<typeof InputCaptureType>;

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

/**
 * Constrained refinement chips (Draft 1 → iterate, D4). Defined here (rather than at the bottom)
 * so plan tiers and other schemas above the plan can reference it.
 */
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
  "stone-to-mulch",
]);
export type RefinementAdjustment = z.infer<typeof RefinementAdjustment>;

/* ------------------------------------------------------------------ */
/* Evidence & catalog records                                          */
/* ------------------------------------------------------------------ */

/** A pointer to where a fact came from — keeps the engine honest. */
export const EvidenceRef = z.object({
  source: z.string(),
  note: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof EvidenceRef>;

export const SourceType = z.enum([
  "user-input",
  "core-library",
  "official",
  "extension-botanical",
  "retailer-cost",
  "ai-inference",
  "live-context",
]);
export type SourceType = z.infer<typeof SourceType>;

export const CacheStatus = z.enum(["disabled", "fresh", "stale", "miss", "unavailable"]);
export type CacheStatus = z.infer<typeof CacheStatus>;

/**
 * A source on the Source Quality Ladder (1 = user input … 6 = AI-only). Defined here (with the
 * other evidence records) so risk warnings and plan evidence can both reference it.
 */
export const SourceRef = z.object({
  name: z.string(),
  sourceName: z.string().optional(),
  sourceType: SourceType.optional(),
  level: z.number().int().min(1).max(6),
  url: z.string().optional(),
  retrievedAt: z.string().optional(),
  /** When a human or trusted process last confirmed this fact (optional, additive). */
  verifiedAt: z.string().optional(),
  supports: z.array(z.string()).default([]),
  confidence: ConfidenceLevel.optional(),
  cacheStatus: CacheStatus.optional(),
  sourceQuality: z.string().optional(),
  /** Free-text caveat shown in the evidence drawer (optional, additive). */
  notes: z.string().optional(),
  needsLocalVerification: z.boolean().default(false),
});
export type SourceRef = z.infer<typeof SourceRef>;

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

export const MeasurementSource = z.enum(["manual", "estimated", "photo", "ar_scan"]);
export type MeasurementSource = z.infer<typeof MeasurementSource>;

/**
 * A real-world size the user gave us (or we estimated). Optional and additive — when present
 * and `areaSqft` is absent, the engine derives area from it (see domain/estimation/quantities).
 * Lower-confidence measurements widen material quantity ranges rather than faking precision.
 */
export const Measurement = z.object({
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  depth: z.number().positive().optional(),
  area: z.number().positive().optional(),
  unit: z.enum(["m", "ft"]).default("ft"),
  source: MeasurementSource.default("estimated"),
  confidence: ConfidenceLevel.default("low"),
  notes: z.string().optional(),
});
export type Measurement = z.infer<typeof Measurement>;

/** Minimal first-plan input. Everything beyond goal/region is optional ("unknown" tolerant). */
export const YardIntake = z.object({
  regionId: z.string(),
  /** Optional ZIP / postal code to refine the hardiness zone (see domain/data/zones.ts). */
  locationQuery: z.string().optional(),
  goal: ProjectGoal,
  /** How broad a project; the engine treats an absent value as the historical "section_plan". */
  scope: ProjectScope.optional(),
  /** Optional problem-language shortcut that pre-fills `goal` in the UI (never used by the engine). */
  problemType: ProblemType.optional(),
  budget: z.number().positive().optional(),
  budgetStyle: BudgetStyle.optional(),
  effortLevel: EffortLevel.default("moderate"),
  areaType: AreaType.optional(),
  areaSqft: z.number().positive().optional(),
  /** Optional real-world dimensions; sharpens area + material ranges when provided. */
  measurement: Measurement.optional(),
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
  /** Set when a ZIP/postal lookup narrowed the hardiness zone (raises confidence). */
  zoneMatch: z
    .object({ label: z.string(), precision: z.enum(["good", "medium"]) })
    .nullable()
    .default(null),
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
  // Honest safety facts from the Core Library, surfaced at the point of decision.
  // Intrinsic plant properties only (site-dependent cautions like deer live in risks).
  safety: z.object({
    toxic: z.boolean(),
    invasive: z.boolean(),
  }),
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

/** Curated how-to topics we can attach to an install phase (see domain/guides). */
export const GuideTopic = z.enum([
  "remove_dead_shrub",
  "install_no_dig_edging",
  "plant_evergreen_shrub",
  "lay_landscape_stone",
  "add_mulch",
  "amend_clay_soil",
  "water_new_shrubs",
  "measure_garden_bed",
  "choose_pet_safe_plants",
  "improve_privacy_strip",
]);
export type GuideTopic = z.infer<typeof GuideTopic>;

/**
 * A how-to link. `kind: "search"` means a generated search URL (honest — we never fabricate an
 * authoritative citation). `kind: "authoritative"` is a stable, known-good source.
 */
export const GuideLink = z.object({
  topic: GuideTopic,
  title: z.string(),
  url: z.string(),
  kind: z.enum(["authoritative", "search"]),
  source: z.string().optional(),
});
export type GuideLink = z.infer<typeof GuideLink>;

export const TutorialLink = GuideLink.extend({
  medium: z.enum(["video", "article"]).default("article"),
});
export type TutorialLink = z.infer<typeof TutorialLink>;

export const InstallPhase = z.object({
  order: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  estHours: z.number().nonnegative(),
  tools: z.array(z.string()).default([]),
  /** Optional curated how-to links for this phase (additive). */
  guides: z.array(GuideLink).optional(),
});
export type InstallPhase = z.infer<typeof InstallPhase>;

export const RiskWarning = z.object({
  id: z.string(),
  severity: RiskSeverity,
  message: z.string(),
  mitigation: z.string(),
  /** Item/plant ids this risk applies to (optional, additive). */
  appliesTo: z.array(z.string()).optional(),
  /** Supporting sources (optional, additive). */
  sourceRefs: z.array(SourceRef).optional(),
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
  questionsFirst: z.array(z.string()).default([]),
  customerUnderestimates: z.array(z.string()),
  goodBetterBest: z.array(z.string()).default([]),
  ifTooExpensive: z.array(z.string()).default([]),
  ifNoTruckOrDelivery: z.array(z.string()).default([]),
  ifDogKidSafetyMatters: z.array(z.string()).default([]),
  ifOutOfStock: z.array(z.string()).default([]),
  substitutions: z.array(z.string()),
  upsells: z.array(z.string()),
  whatNotToSell: z.array(z.string()).default([]),
  disclaimer: z.string().default("Guidance only, not a guarantee. Verify local conditions, labels, and availability."),
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
/* Trust moat: evidence, alternatives, failure points, store, readiness */
/* ------------------------------------------------------------------ */

/* SourceType, CacheStatus, and SourceRef are defined earlier (evidence records section). */

export const ConfidenceDimension = z.object({ dimension: z.string(), level: z.string() });
export type ConfidenceDimension = z.infer<typeof ConfidenceDimension>;

/** "Why should I trust this?" — the evidence drawer payload. */
export const PlanEvidence = z.object({
  inputs: z.array(z.string()),
  assumptions: z.array(z.string()),
  sources: z.array(SourceRef),
  confidenceByDimension: z.array(ConfidenceDimension),
  needsLocalVerification: z.array(z.string()).default([]),
  fallbackNotes: z.array(z.string()).default([]),
});
export type PlanEvidence = z.infer<typeof PlanEvidence>;

export const AlternativeKind = z.enum([
  "substitute",
  "cheaper",
  "lower-maintenance",
  "pet-safer",
  "premium",
  "avoid",
]);
export type AlternativeKind = z.infer<typeof AlternativeKind>;

export const Alternative = z.object({
  kind: AlternativeKind,
  label: z.string(),
  note: z.string().optional(),
});
export type Alternative = z.infer<typeof Alternative>;

export const PlantAlternatives = z.object({
  plantId: z.string(),
  commonName: z.string(),
  options: z.array(Alternative),
});
export type PlantAlternatives = z.infer<typeof PlantAlternatives>;

export const FailurePoint = z.object({ risk: z.string(), fix: z.string() });
export type FailurePoint = z.infer<typeof FailurePoint>;

export const AvailabilityState = z.enum([
  "likely-common",
  "needs-local-check",
  "specialty-order",
  "verify-online",
]);
export type AvailabilityState = z.infer<typeof AvailabilityState>;

/** A "search at the store" entry — honest: no live inventory, just a query + state. */
export const StoreSearch = z.object({
  name: z.string(),
  query: z.string(),
  availability: AvailabilityState,
  substitute: z.string().optional(),
  cheaperAlternative: z.string().optional(),
  easierAlternative: z.string().optional(),
  deliveryRecommended: z.boolean().default(false),
  note: z.string().optional(),
});
export type StoreSearch = z.infer<typeof StoreSearch>;

export const ReadinessFactor = z.object({ label: z.string(), done: z.boolean() });
export type ReadinessFactor = z.infer<typeof ReadinessFactor>;

/** Gamified completeness meter — answering accuracy questions fills it up. */
export const Readiness = z.object({
  score: z.number().int().min(0).max(100),
  label: z.string(),
  factors: z.array(ReadinessFactor),
});
export type Readiness = z.infer<typeof Readiness>;

/**
 * A "quick / better / best" framing of the same plan. Derived deterministically from existing
 * tuning + budget math (see domain/tiers) — not a new scoring engine. Totals are estimate ranges.
 */
export const PlanTier = z.object({
  tier: z.enum(["quick_fix", "better_fix", "best_fix"]),
  label: z.string(),
  summary: z.string(),
  estTotal: MoneyRange,
  appliedAdjustments: z.array(RefinementAdjustment).default([]),
});
export type PlanTier = z.infer<typeof PlanTier>;

/**
 * Optional plant image with attribution/licensing. Schema only for now — the catalog is left
 * empty until real, license-cleared assets are curated (we never fabricate URLs or licenses).
 */
export const PlantImageAsset = z.object({
  plantId: z.string(),
  url: z.string(),
  thumbnailUrl: z.string().optional(),
  source: z.string(),
  creator: z.string().optional(),
  license: z.string().optional(),
  attributionText: z.string().optional(),
  commercialOk: z.boolean(),
  verifiedAt: z.string().optional(),
});
export type PlantImageAsset = z.infer<typeof PlantImageAsset>;

/**
 * Free/Open Data Mode configuration (resolved from env in src/lib/freeDataMode.ts). Kept as a
 * plain domain type so the engine can stay framework- and env-free.
 */
export const FreeDataModeConfig = z.object({
  enabled: z.boolean(),
  allowExternalFetches: z.boolean(),
  useGeneratedRetailerLinks: z.boolean(),
  useCuratedGuides: z.boolean(),
  useManualPriceBands: z.boolean(),
  weatherMode: z.enum(["seasonal_rules", "optional_provider"]),
  stockMode: z.enum(["search_links_only", "cached_signals"]),
});
export type FreeDataModeConfig = z.infer<typeof FreeDataModeConfig>;

/* ------------------------------------------------------------------ */

/**
 * Season-by-season interest, derived deterministically from each plant's Core Library
 * `seasonInterest` note and type. **Season granularity only** — the library does not encode
 * exact bloom months, so Bloomprint never claims them. Arrays hold plant common names.
 */
export const SeasonalInterest = z.object({
  spring: z.array(z.string()),
  summer: z.array(z.string()),
  fall: z.array(z.string()),
  winter: z.array(z.string()),
  /** Plants that hold structure year-round (evergreens / grasses) — a baseline every season. */
  evergreenStructure: z.array(z.string()),
});
export type SeasonalInterest = z.infer<typeof SeasonalInterest>;

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
  // Trust moat:
  evidence: PlanEvidence,
  alternatives: z.array(PlantAlternatives),
  failurePoints: z.array(FailurePoint),
  storeSearches: z.array(StoreSearch),
  readiness: Readiness,
  /** Optional quick/better/best framings (additive; absent for spot fixes). */
  tiers: z.array(PlanTier).optional(),
  /** Season-by-season interest from Core Library season notes (season granularity, not months). */
  seasonalInterest: SeasonalInterest,
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

export const PlanProvider = z.enum([
  "mock",
  "claude",
  "deepseek",
  "qwen",
  "doubao",
  "glm",
  "siliconflow",
  "ollama",
  "none",
]);
export type PlanProvider = z.infer<typeof PlanProvider>;

/** The full plan returned to the UI: deterministic truth + optional presentation layer. */
export const BloomprintPlan = z.object({
  plan: DeterministicPlan,
  enhancement: AIPlanEnhancement.nullable(),
  enhancedBy: PlanProvider,
  generatedAt: z.string(),
});
export type BloomprintPlan = z.infer<typeof BloomprintPlan>;

/* RefinementAdjustment is defined near the top (after PlanLabel) so plan tiers can use it. */
