// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  archivePlan,
  clearPlans,
  deletePlan,
  duplicatePlan,
  getSavedPlan,
  listArchivedPlans,
  listSavedPlans,
  restorePlan,
  savePlan,
  type SavedPlan,
  type SavedPlanSummary,
} from "@/lib/plansStore";
import type { YardIntake } from "@/domain/models";

const summary: SavedPlanSummary = {
  styleLabel: "Modern",
  goal: "privacy",
  diyMin: 100,
  diyMax: 200,
  confidence: "medium",
  plantCount: 5,
};

function entry(label: string, region: string): Omit<SavedPlan, "id" | "createdAt"> {
  // intake is stored/compared as JSON; a minimal distinct stub is enough for the store's logic.
  return { label, intake: { regionId: region } as unknown as YardIntake, adjustments: [], summary };
}

beforeEach(() => {
  clearPlans();
});

describe("plansStore project management", () => {
  it("saves and lists active plans newest-first", () => {
    savePlan(entry("A", "r1"));
    savePlan(entry("B", "r2"));
    expect(listSavedPlans().map((p) => p.label)).toEqual(["B", "A"]);
  });

  it("duplicatePlan creates an independent copy and bypasses dedupe", () => {
    const a = savePlan(entry("A", "r1"));
    const copy = duplicatePlan(a.id);
    expect(copy).not.toBeNull();
    expect(copy!.id).not.toBe(a.id);
    expect(copy!.label).toBe("A (copy)");
    // Same inputs but still a second plan — duplication is intentional.
    expect(listSavedPlans()).toHaveLength(2);
  });

  it("duplicatePlan accepts a custom label and returns null for unknown ids", () => {
    const a = savePlan(entry("A", "r1"));
    expect(duplicatePlan(a.id, "My copy")!.label).toBe("My copy");
    expect(duplicatePlan("does-not-exist")).toBeNull();
  });

  it("archive hides from the active list but keeps it recoverable; restore brings it back", () => {
    const a = savePlan(entry("A", "r1"));
    archivePlan(a.id);
    expect(listSavedPlans()).toHaveLength(0);
    expect(listArchivedPlans().map((p) => p.id)).toEqual([a.id]);
    expect(getSavedPlan(a.id)?.id).toBe(a.id); // still findable by id

    restorePlan(a.id);
    expect(listSavedPlans().map((p) => p.id)).toEqual([a.id]);
    expect(listArchivedPlans()).toHaveLength(0);
  });

  it("delete removes a plan permanently", () => {
    const a = savePlan(entry("A", "r1"));
    deletePlan(a.id);
    expect(getSavedPlan(a.id)).toBeNull();
  });
});
