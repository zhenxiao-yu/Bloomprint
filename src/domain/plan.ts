/**
 * The deterministic planning engine — orchestrates rules → scoring → estimation → generators
 * into a complete DeterministicPlan. This is the source of truth (docs/DECISIONS.md D1).
 *
 * `generateDeterministicPlan` produces Draft 1; `refinePlan` re-runs it with refinement chips.
 * Same inputs (+ same adjustments) always yield the same plan — no randomness.
 */
import type { DeterministicPlan, MaterialCategory, RefinementAdjustment, YardIntake } from "@/domain/models";
import { resolveRegion, resolveSite } from "@/domain/rules";
import { resolveStyleFamily, STYLES } from "@/domain/styles";
import {
  scoreConfidence,
  scoreFeasibility,
  scorePlanFit,
  selectPlantCandidates,
} from "@/domain/scoring";
import {
  estimateEquipment,
  estimateLabor,
  estimateMaterials,
  estimateProjectBudget,
  estimateTools,
} from "@/domain/estimation";
import {
  buildAccuracyUpgrades,
  buildConfidenceReasons,
  buildSeasonalInterest,
  buildStaffNotes,
  buildTopActions,
  buildVisualSummary,
  choosePlanLabel,
  composePalette,
  computeReadiness,
  deriveInsight,
  generateFailurePoints,
  matureSize,
  sunLabel,
  generateInstallPhases,
  generatePlanNarrative,
  generateRiskWarnings,
  generateShoppingList,
} from "@/domain/generators";
import { buildPlanEvidence } from "@/domain/evidence/sourceQuality";
import { generateAllAlternatives } from "@/domain/alternatives";
import { buildStoreSearches } from "@/domain/store";
import { deriveTuning } from "@/domain/tuning";
import { buildPlanTiers } from "@/domain/tiers";
import { guidesForPhase } from "@/domain/guides";

/** Spot fixes are intentionally tiny — a handful of plants, no decorative extras. */
const SPOT_FIX_PLANT_LIMIT = 3;

export interface PlanOptions {
  adjustments?: RefinementAdjustment[];
}

export function generateDeterministicPlan(intake: YardIntake, options: PlanOptions = {}): DeterministicPlan {
  const tuning = deriveTuning(options.adjustments);
  const { region, recognized } = resolveRegion(intake.regionId);
  const site = resolveSite(intake);
  const style = tuning.forceStyle ?? resolveStyleFamily(intake);

  const scope = intake.scope ?? "section_plan";
  const candidates = selectPlantCandidates(site, intake, style, tuning);
  let placements = composePalette(candidates, site, intake, tuning);

  // A spot fix is a small, surgical change — keep just the best-fitting few plants.
  if (scope === "spot_fix") placements = placements.slice(0, SPOT_FIX_PLANT_LIMIT);

  // Safety net: never return a plantless plan if any candidate survived the filters.
  if (placements.length === 0 && candidates.length > 0) {
    const top = candidates[0];
    placements = [
      {
        plantId: top.plant.id,
        commonName: top.plant.commonName,
        role: "front",
        quantity: 3,
        spacingNote: `Space about ${Math.round(top.plant.spacingCm / 2.54)} in apart.`,
        unitPrice: top.plant.unitPrice,
        lineTotal: { min: top.plant.unitPrice.min * 3, max: top.plant.unitPrice.max * 3 },
        fit: top.fit,
        type: top.plant.type,
        matureSize: matureSize(top.plant.matureHeightCm, top.plant.matureWidthCm),
        sunLabel: sunLabel(top.plant.sun),
        maintenance: top.plant.maintenance,
        safety: { toxic: top.plant.toxicToPetsOrKids, invasive: top.plant.invasive },
      },
    ];
  }

  let materialPicks = estimateMaterials(site, intake, style, tuning);
  // A spot fix skips decorative extras (stone, lighting) — just soil, mulch, and edging.
  if (scope === "spot_fix") {
    materialPicks = materialPicks.filter(
      (p) => p.material.category !== "stone" && p.material.category !== "lighting",
    );
  }
  const tools = estimateTools(materialPicks);
  const equipment = estimateEquipment(site);
  const labor = estimateLabor(placements, site, intake);
  const shoppingList = generateShoppingList(placements, materialPicks);
  const budget = estimateProjectBudget(shoppingList, equipment);

  const materialCategories = new Set<MaterialCategory>(materialPicks.map((p) => p.material.category));
  const installPhases = generateInstallPhases(labor.totalHours, materialCategories).map((phase) => ({
    ...phase,
    guides: guidesForPhase(phase.title, materialCategories, intake),
  }));
  const risks = generateRiskWarnings(site, intake, placements);

  const confidence = scoreConfidence(intake, recognized, region.confidence, site.zoneMatch?.precision ?? null);
  const scores = {
    planFit: scorePlanFit(placements),
    feasibility: scoreFeasibility(budget, labor, intake),
    confidence: confidence.value,
  };

  return {
    intake,
    site,
    style,
    styleLabel: STYLES[style].label,
    insight: deriveInsight(site, intake, placements),
    narrative: generatePlanNarrative(style, placements, intake),
    visualSummary: buildVisualSummary(style, placements, labor.weekends, intake),
    plants: placements,
    shoppingList,
    tools,
    equipment,
    budget,
    labor,
    installPhases,
    risks,
    topActions: buildTopActions(risks),
    bestWeatherWindow: region.weatherWindow,
    staff: buildStaffNotes(placements, site, shoppingList),
    scores,
    confidence: confidence.level,
    confidenceSentence: confidence.sentence,
    confidenceReasons: buildConfidenceReasons(site, intake, recognized),
    accuracyUpgrades: buildAccuracyUpgrades(intake),
    planLabel: choosePlanLabel(confidence.value, recognized),
    evidence: buildPlanEvidence(site, intake),
    alternatives: generateAllAlternatives(placements, site, intake),
    failurePoints: generateFailurePoints(site, intake, placements),
    storeSearches: buildStoreSearches(shoppingList),
    readiness: computeReadiness(intake),
    tiers: buildPlanTiers(intake, budget.diyTotal),
    seasonalInterest: buildSeasonalInterest(placements),
  };
}

/** Re-generate a plan with a refinement chip applied (Draft 1 → iterate). */
export function refinePlan(
  intake: YardIntake,
  adjustment: RefinementAdjustment,
  existing: RefinementAdjustment[] = [],
): DeterministicPlan {
  const adjustments = existing.includes(adjustment) ? existing : [...existing, adjustment];
  return generateDeterministicPlan(intake, { adjustments });
}
