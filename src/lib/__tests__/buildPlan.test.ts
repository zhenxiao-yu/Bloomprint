import { describe, expect, it } from "vitest";
import { BloomprintPlan } from "@/domain/models";
import { FIXTURES } from "@/domain";
import { buildBloomprintPlan } from "@/lib/buildPlan";
import { MockProvider } from "@/ai";

describe("buildBloomprintPlan — full pipeline with the default mock provider", () => {
  it("returns a schema-valid BloomprintPlan enhanced by the mock provider", async () => {
    const result = await buildBloomprintPlan(FIXTURES["oakville-front-yard"]);
    expect(() => BloomprintPlan.parse(result)).not.toThrow();
    expect(result.enhancedBy).toBe("mock");
    expect(result.enhancement).not.toBeNull();
    expect(result.plan.plants.length).toBeGreaterThan(0);
  });

  it("works with AI disabled and no provider key", async () => {
    const oldEnabled = process.env.ENABLE_AI;
    const oldProvider = process.env.AI_PROVIDER;
    process.env.ENABLE_AI = "false";
    process.env.AI_PROVIDER = "deepseek";
    const result = await buildBloomprintPlan(FIXTURES["oakville-front-yard"]);
    expect(() => BloomprintPlan.parse(result)).not.toThrow();
    expect(result.enhancedBy).toBe("mock");
    process.env.ENABLE_AI = oldEnabled;
    process.env.AI_PROVIDER = oldProvider;
  });

  it("applies refinement adjustments through the pipeline", async () => {
    const result = await buildBloomprintPlan(FIXTURES["pet-safe-front-yard"], ["dog-safe"]);
    expect(() => BloomprintPlan.parse(result)).not.toThrow();
  });
});

describe("MockProvider — presentation only, no invented facts", () => {
  it("produces a valid enhancement that references the plan's own numbers", async () => {
    const plan = (await buildBloomprintPlan(FIXTURES["privacy-side-yard"])).plan;
    const enhancement = await new MockProvider().enhancePlan(plan);
    expect(enhancement).not.toBeNull();
    expect(enhancement?.simplifiedSummary).toContain(`${plan.budget.diyTotal.min}`);
    expect(enhancement?.staffTalkingPoints?.length ?? 0).toBeGreaterThan(0);
  });
});
