import { afterEach, describe, expect, it } from "vitest";
import {
  entitlementsForPlan,
  FREE_ENTITLEMENTS,
  planForPriceId,
  PLANS,
  resolveEntitlements,
} from "@/lib/billing/plans";
import {
  canCreateProject,
  canUseAiRefinement,
  canUseFeature,
  remaining,
  withinLimit,
} from "@/lib/billing/entitlements";

describe("plan entitlements", () => {
  it("free is the safe default and never gates the engine", () => {
    expect(FREE_ENTITLEMENTS.cloudSync).toBe(true);
    expect(FREE_ENTITLEMENTS.staffMode).toBe(false);
    expect(FREE_ENTITLEMENTS.aiRefinementsPerMonth).toBe(0);
  });

  it("paid tiers strictly expand limits", () => {
    expect(PLANS.plus.entitlements.maxProjects).toBeGreaterThan(PLANS.free.entitlements.maxProjects);
    expect(PLANS.pro.entitlements.maxProjects).toBeGreaterThan(PLANS.plus.entitlements.maxProjects);
    expect(PLANS.pro.entitlements.staffMode).toBe(true);
    expect(PLANS.plus.entitlements.advancedEvidence).toBe(true);
  });

  it("resolves to Free when a subscription is not active", () => {
    expect(resolveEntitlements("pro", "canceled")).toEqual(FREE_ENTITLEMENTS);
    expect(resolveEntitlements("pro", "past_due")).toEqual(FREE_ENTITLEMENTS);
    expect(resolveEntitlements("pro", "active")).toEqual(entitlementsForPlan("pro"));
    expect(resolveEntitlements("plus", "trialing").advancedEvidence).toBe(true);
  });
});

describe("planForPriceId", () => {
  afterEach(() => {
    delete process.env.STRIPE_PRICE_PLUS_MONTHLY;
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
  });

  it("maps configured price ids to plans, unknown → free", () => {
    process.env.STRIPE_PRICE_PLUS_MONTHLY = "price_plus";
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro";
    expect(planForPriceId("price_plus")).toBe("plus");
    expect(planForPriceId("price_pro")).toBe("pro");
    expect(planForPriceId("price_unknown")).toBe("free");
    expect(planForPriceId(null)).toBe("free");
  });
});

describe("entitlement checks", () => {
  it("gates boolean features and counted limits", () => {
    const free = PLANS.free.entitlements;
    const pro = PLANS.pro.entitlements;
    expect(canUseFeature(free, "staffMode")).toBe(false);
    expect(canUseFeature(pro, "staffMode")).toBe(true);
    expect(canCreateProject(free, 3)).toBe(false);
    expect(canCreateProject(free, 2)).toBe(true);
    expect(canUseAiRefinement(free, 0)).toBe(false); // free has 0
    expect(canUseAiRefinement(pro, 10)).toBe(true);
    expect(remaining(50, 12)).toBe(38);
    expect(withinLimit(PLANS.plus.entitlements, "cloudPhotos", 99)).toBe(true);
    expect(withinLimit(PLANS.plus.entitlements, "cloudPhotos", 100)).toBe(false);
  });
});
