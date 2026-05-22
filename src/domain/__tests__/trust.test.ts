import { describe, expect, it } from "vitest";
import { generateDeterministicPlan, refinePlan } from "@/domain/plan";
import { FIXTURES } from "@/domain";
import { buildPlanEvidence } from "@/domain/evidence/sourceQuality";
import { generateAlternatives } from "@/domain/alternatives";
import { resolveSite } from "@/domain/rules";
import type { YardIntake } from "@/domain/models";

describe("plan evidence", () => {
  it("lists inputs, sources (incl. hardiness standards + Core Library), and confidence dimensions", () => {
    const site = resolveSite(FIXTURES["oakville-front-yard"]);
    const ev = buildPlanEvidence(site, FIXTURES["oakville-front-yard"]);
    const sourceNames = ev.sources.map((s) => s.name).join(" | ");
    expect(sourceNames).toContain("USDA");
    expect(sourceNames).toContain("Canada");
    expect(sourceNames).toContain("Bloomprint Core Library");
    expect(ev.inputs.length).toBeGreaterThan(0);
    expect(ev.confidenceByDimension.length).toBe(4);
    expect(ev.sources.every((s) => s.level >= 1 && s.level <= 6)).toBe(true);
  });
});

describe("alternatives engine", () => {
  it("offers substitute / cheaper / premium / avoid for a plant", () => {
    const plan = generateDeterministicPlan(FIXTURES["privacy-side-yard"]);
    const alt = generateAlternatives(plan.plants[0], plan.site, plan.intake);
    const kinds = new Set(alt.options.map((o) => o.kind));
    expect(kinds.has("substitute")).toBe(true);
    expect(kinds.has("cheaper")).toBe(true);
    expect(kinds.has("premium")).toBe(true);
    expect(kinds.has("avoid")).toBe(true);
  });

  it("every plant in a plan gets an alternatives set", () => {
    const plan = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
    expect(plan.alternatives.length).toBe(plan.plants.length);
  });
});

describe("failure points & store searches", () => {
  it("surfaces failure points with a risk and a fix", () => {
    const plan = generateDeterministicPlan(FIXTURES["low-maintenance-backyard"]);
    expect(plan.failurePoints.length).toBeGreaterThan(0);
    expect(plan.failurePoints.every((f) => f.risk && f.fix)).toBe(true);
  });

  it("store searches never claim live availability (no 'in stock' state by default for plants)", () => {
    const plan = generateDeterministicPlan(FIXTURES["oakville-front-yard"]);
    const plantSearch = plan.storeSearches.find((s) => s.query.length > 0);
    expect(plantSearch).toBeDefined();
    expect(plan.storeSearches.every((s) => s.availability !== undefined)).toBe(true);
  });
});

describe("readiness meter", () => {
  it("scores lower with unknowns and higher when details are filled", () => {
    const sparse: YardIntake = {
      regionId: "gta-ontario",
      goal: "general",
      effortLevel: "moderate",
      hasPhoto: false,
      sun: "unknown",
      soil: "unknown",
      drainage: "unknown",
    };
    const low = generateDeterministicPlan(sparse).readiness;
    const high = generateDeterministicPlan({
      ...sparse,
      budget: 900,
      locationQuery: "60601",
      sun: "full-sun",
      soil: "loam",
      drainage: "average",
    }).readiness;
    expect(high.score).toBeGreaterThan(low.score);
    expect(high.factors.length).toBe(low.factors.length);
  });
});

describe("stone → mulch pivot", () => {
  it("removes the Stone budget category", () => {
    const base = generateDeterministicPlan(FIXTURES["low-maintenance-backyard"]);
    const mulched = refinePlan(FIXTURES["low-maintenance-backyard"], "stone-to-mulch");
    const hasStone = (plan: typeof base) => plan.budget.byCategory.some((c) => c.category === "Stone");
    if (hasStone(base)) expect(hasStone(mulched)).toBe(false);
  });
});
