import { describe, expect, it } from "vitest";

import { computeSeedStarting, SEED_CROP_KEYS } from "@/domain/toolbox/seedStarting";

describe("computeSeedStarting", () => {
  it("returns a schedule for every crop", () => {
    const r = computeSeedStarting({ frostMonth: 5, frostDay: 15 })!;
    expect(r.crops.length).toBe(SEED_CROP_KEYS.length);
  });

  it("puts tomato indoor sow ~6 weeks before a May 15 frost (early April)", () => {
    const tomato = computeSeedStarting({ frostMonth: 5, frostDay: 15 })!.crops.find((c) => c.key === "tomato")!;
    expect(tomato.indoorSow!.month).toBe(4); // April
    expect(tomato.transplant!.month).toBe(5); // a week after frost
  });

  it("rolls back across the year boundary for long-lead crops (onion, -10 weeks)", () => {
    const onion = computeSeedStarting({ frostMonth: 3, frostDay: 1 })!.crops.find((c) => c.key === "onion")!;
    // 10 weeks before March 1 → late December (previous year), month surfaces as 12
    expect(onion.indoorSow!.month).toBe(12);
  });

  it("direct-sow-only crops have no indoor date", () => {
    const beans = computeSeedStarting({ frostMonth: 5, frostDay: 15 })!.crops.find((c) => c.key === "beans")!;
    expect(beans.indoorSow).toBeUndefined();
    expect(beans.directSow).toBeDefined();
  });
});
