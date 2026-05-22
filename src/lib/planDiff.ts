/**
 * planDiff — a pure, testable comparison of two plans for the side-by-side compare view.
 * Operates on the deterministic plan inside each BloomprintPlan.
 */
import type { BloomprintPlan } from "@/domain/models";

export interface PlanDiff {
  styleChanged: boolean;
  styleA: string;
  styleB: string;
  addedPlants: string[];
  removedPlants: string[];
  budgetDelta: { min: number; max: number };
  confidenceDelta: number;
  effortChanged: boolean;
  effortA: string;
  effortB: string;
}

export function diffPlans(a: BloomprintPlan, b: BloomprintPlan): PlanDiff {
  const pa = a.plan;
  const pb = b.plan;

  const aIds = new Map(pa.plants.map((p) => [p.plantId, p.commonName]));
  const bIds = new Map(pb.plants.map((p) => [p.plantId, p.commonName]));

  const addedPlants = [...bIds].filter(([id]) => !aIds.has(id)).map(([, name]) => name);
  const removedPlants = [...aIds].filter(([id]) => !bIds.has(id)).map(([, name]) => name);

  return {
    styleChanged: pa.style !== pb.style,
    styleA: pa.styleLabel,
    styleB: pb.styleLabel,
    addedPlants,
    removedPlants,
    budgetDelta: {
      min: pb.budget.diyTotal.min - pa.budget.diyTotal.min,
      max: pb.budget.diyTotal.max - pa.budget.diyTotal.max,
    },
    confidenceDelta: Number((pb.scores.confidence - pa.scores.confidence).toFixed(3)),
    effortChanged: pa.intake.effortLevel !== pb.intake.effortLevel,
    effortA: pa.visualSummary.expectedEffort,
    effortB: pb.visualSummary.expectedEffort,
  };
}
