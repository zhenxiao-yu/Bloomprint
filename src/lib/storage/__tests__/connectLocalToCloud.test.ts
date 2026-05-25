import { describe, expect, it, vi } from "vitest";
import { migrateLocalPlansToCloud } from "@/lib/storage/connectLocalToCloud";
import type { SavedPlan } from "@/lib/plansStore";

const plan = (label: string): SavedPlan =>
  ({ id: label, label, intake: {}, adjustments: [], summary: {}, createdAt: 0 }) as unknown as SavedPlan;

// Minimal cloud `projects` store: pre-seeded labels + a recording/throwing save.
function makeStore(existingLabels: string[], opts: { throwOn?: string } = {}) {
  const saved: string[] = [];
  const store = {
    listProjects: vi.fn(async () => existingLabels.map((label) => ({ label }))),
    saveProjectWithVersion: vi.fn(async (input: { label: string }) => {
      if (opts.throwOn === input.label) throw new Error("cloud down");
      saved.push(input.label);
      return { id: input.label };
    }),
  };
  return { store: store as never, saved };
}

describe("migrateLocalPlansToCloud", () => {
  it("no-ops on an empty device", async () => {
    const { store } = makeStore([]);
    expect(await migrateLocalPlansToCloud(store, [])).toEqual({ synced: 0, failed: 0, skipped: 0 });
  });

  it("syncs new plans and never touches local", async () => {
    const { store, saved } = makeStore([]);
    const res = await migrateLocalPlansToCloud(store, [plan("Front yard"), plan("Backyard")]);
    expect(res).toEqual({ synced: 2, failed: 0, skipped: 0 });
    expect(saved).toEqual(["Front yard", "Backyard"]);
  });

  it("skips plans whose label already exists in the cloud (idempotent re-run)", async () => {
    const { store, saved } = makeStore(["Front yard"]);
    const res = await migrateLocalPlansToCloud(store, [plan("Front yard"), plan("Backyard")]);
    expect(res).toEqual({ synced: 1, failed: 0, skipped: 1 });
    expect(saved).toEqual(["Backyard"]);
  });

  it("counts a failed save without aborting the batch (stays safe on-device)", async () => {
    const { store, saved } = makeStore([], { throwOn: "Backyard" });
    const res = await migrateLocalPlansToCloud(store, [plan("Front yard"), plan("Backyard"), plan("Side")]);
    expect(res).toEqual({ synced: 2, failed: 1, skipped: 0 });
    expect(saved).toEqual(["Front yard", "Side"]);
  });

  it("dedupes two device plans that share a label within one run", async () => {
    const { store } = makeStore([]);
    const res = await migrateLocalPlansToCloud(store, [plan("Yard"), plan("Yard")]);
    expect(res).toEqual({ synced: 1, failed: 0, skipped: 1 });
  });
});
