import { describe, expect, it } from "vitest";
import { DeterministicPlan, type YardIntake } from "@/domain/models";
import { generateDeterministicPlan, refinePlan } from "@/domain/plan";
import { FIXTURES } from "@/domain/fixtures";
import { getPlant } from "@/domain/data";

const fixtureEntries = Object.entries(FIXTURES);

describe("generateDeterministicPlan — every fixture yields a complete, valid plan", () => {
  for (const [key, intake] of fixtureEntries) {
    describe(key, () => {
      const plan = generateDeterministicPlan(intake);

      it("matches the DeterministicPlan schema", () => {
        expect(() => DeterministicPlan.parse(plan)).not.toThrow();
      });

      it("includes plants, tools, labor hours, and install phases", () => {
        expect(plan.plants.length).toBeGreaterThan(0);
        expect(plan.tools.length).toBeGreaterThan(0);
        expect(plan.labor.totalHours).toBeGreaterThan(0);
        expect(plan.installPhases.length).toBeGreaterThan(0);
        expect(plan.shoppingList.length).toBeGreaterThan(0);
      });

      it("gives every plant a fit score and at least one reason or warning", () => {
        for (const p of plan.plants) {
          expect(p.fit.score).toBeGreaterThanOrEqual(0);
          expect(p.fit.score).toBeLessThanOrEqual(1);
          expect(p.fit.reasons.length + p.fit.warnings.length).toBeGreaterThan(0);
        }
      });

      it("prices everything as a range and exposes an Expected DIY total", () => {
        for (const item of plan.shoppingList) {
          expect(item.price.min).toBeLessThanOrEqual(item.price.max);
        }
        expect(plan.budget.diyTotal.min).toBeLessThanOrEqual(plan.budget.diyTotal.max);
        expect(plan.budget.byCategory.length).toBeGreaterThan(0);
      });

      it("groups the shopping list into Buy First / Can Wait / Optional", () => {
        const priorities = new Set(plan.shoppingList.map((i) => i.priority));
        expect(priorities.has("buy-first")).toBe(true);
      });

      it("surfaces a non-empty standout insight and a confidence sentence", () => {
        expect(plan.insight.length).toBeGreaterThan(20);
        expect(plan.confidenceSentence.length).toBeGreaterThan(0);
        expect(plan.confidenceReasons.length).toBeGreaterThan(0);
      });

      it("includes a transformation, staff notes, and a planting window", () => {
        expect(plan.visualSummary.transformation.current.length).toBeGreaterThan(0);
        expect(plan.visualSummary.transformation.planned.length).toBeGreaterThan(0);
        expect(plan.visualSummary.transformation.feeling.length).toBeGreaterThan(0);
        expect(plan.staff.customerUnderestimates.length + plan.staff.substitutions.length).toBeGreaterThan(0);
        expect(plan.staff.upsells.length).toBeGreaterThan(0);
        expect(plan.bestWeatherWindow.length).toBeGreaterThan(0);
      });

      it("the insight is specific, not the generic boilerplate", () => {
        expect(plan.insight).not.toContain("plants suitable for your region");
      });

      it("scores are all normalized 0..1", () => {
        expect(plan.scores.planFit).toBeGreaterThanOrEqual(0);
        expect(plan.scores.planFit).toBeLessThanOrEqual(1);
        expect(plan.scores.feasibility).toBeGreaterThanOrEqual(0);
        expect(plan.scores.confidence).toBeGreaterThanOrEqual(0);
      });
    });
  }
});

describe("determinism", () => {
  it("produces identical plans for identical input", () => {
    const a = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
    const b = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});

describe("variety", () => {
  it("does not assign the same style family to every fixture", () => {
    const styles = new Set(fixtureEntries.map(([, intake]) => generateDeterministicPlan(intake).style));
    expect(styles.size).toBeGreaterThan(1);
  });
});

describe("unknown inputs reduce confidence but never block", () => {
  const base: YardIntake = {
    regionId: "gta-ontario",
    goal: "general",
    effortLevel: "moderate",
    hasPhoto: false,
    sun: "unknown",
    soil: "unknown",
    drainage: "unknown",
  };

  it("still produces a plan with assumptions surfaced and accuracy upgrades offered", () => {
    const plan = generateDeterministicPlan(base);
    expect(plan.plants.length).toBeGreaterThan(0);
    expect(plan.site.assumptions.length).toBeGreaterThan(0);
    expect(plan.accuracyUpgrades.length).toBeGreaterThan(0);
  });

  it("scores lower confidence than a fully-specified yard", () => {
    const unknownPlan = generateDeterministicPlan(base);
    const knownPlan = generateDeterministicPlan({
      ...base,
      sun: "full-sun",
      soil: "loam",
      drainage: "well-drained",
      areaSqft: 120,
    });
    expect(knownPlan.scores.confidence).toBeGreaterThan(unknownPlan.scores.confidence);
  });
});

describe("refinement chips change the plan (Draft 1 -> iterate)", () => {
  const petYard = FIXTURES["pet-safe-front-yard"];

  it("'dog-safe' removes all plants toxic to pets/kids", () => {
    const refined = refinePlan(petYard, "dog-safe");
    for (const p of refined.plants) {
      expect(getPlant(p.plantId)?.toxicToPetsOrKids).toBe(false);
    }
  });

  it("'cheaper' does not increase the Expected DIY total", () => {
    const base = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
    const cheaper = refinePlan(FIXTURES["oakville-front-yard"], "cheaper");
    expect(cheaper.budget.diyTotal.max).toBeLessThanOrEqual(base.budget.diyTotal.max);
  });

  it("'more-flowers' increases the share of perennials", () => {
    const base = generateDeterministicPlan(FIXTURES["privacy-side-yard"]);
    const flowers = refinePlan(FIXTURES["privacy-side-yard"], "more-flowers");
    const perennialCount = (plan: typeof base) =>
      plan.plants.filter((p) => getPlant(p.plantId)?.type === "perennial").reduce((s, p) => s + p.quantity, 0);
    expect(perennialCount(flowers)).toBeGreaterThanOrEqual(perennialCount(base));
  });

  it("'salt-safe' keeps only salt-tolerant plants", () => {
    const refined = refinePlan(FIXTURES["oakville-front-yard"], "salt-safe");
    for (const p of refined.plants) {
      expect(getPlant(p.plantId)?.saltTolerant).toBe(true);
    }
  });

  it("'more-privacy' adds a tall screen layer", () => {
    const refined = refinePlan(FIXTURES["low-maintenance-backyard"], "more-privacy");
    expect(refined.plants.some((p) => p.role === "screen")).toBe(true);
  });

  it("'more-modern' forces the modern-minimal style", () => {
    const refined = refinePlan(FIXTURES["oakville-front-yard"], "more-modern");
    expect(refined.style).toBe("modern-minimal");
  });

  it("'less-trimming' drops shearing-heavy hedging from a privacy plan", () => {
    const refined = refinePlan(FIXTURES["privacy-side-yard"], "less-trimming");
    const trimHeavy = ["emerald-cedar", "green-velvet-boxwood", "hicks-yew"];
    expect(refined.plants.every((p) => !trimHeavy.includes(p.plantId))).toBe(true);
  });
});

describe("pet-safe fixture flags toxicity as a risk before refinement", () => {
  it("includes a high-severity toxicity risk when a toxic plant is selected", () => {
    const plan = generateDeterministicPlan(FIXTURES["pet-safe-front-yard"]);
    const hasToxicPlant = plan.plants.some((p) => getPlant(p.plantId)?.toxicToPetsOrKids);
    if (hasToxicPlant) {
      expect(plan.risks.some((r) => r.id === "toxic" && r.severity === "high")).toBe(true);
    } else {
      // If the engine already avoided toxic plants, that's also acceptable.
      expect(hasToxicPlant).toBe(false);
    }
  });
});
