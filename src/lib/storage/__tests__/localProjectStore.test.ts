import { beforeEach, describe, expect, it } from "vitest";
import { localProjectStore } from "@/lib/storage/localProjectStore";
import type { SaveProjectInput } from "@/lib/storage/types";
import type { YardIntake } from "@/domain/models";

// Minimal in-memory localStorage so the on-device store works under the `node` test environment.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

const intake: YardIntake = {
  regionId: "oakville",
  goal: "privacy",
  effortLevel: "moderate",
  hasPhoto: false,
  sun: "unknown",
  soil: "unknown",
  drainage: "unknown",
};

function input(label: string): SaveProjectInput {
  return {
    label,
    versionLabel: "Draft 1",
    intake,
    adjustments: [],
    summary: {
      styleLabel: "Modern Minimal",
      goal: "privacy",
      diyMin: 100,
      diyMax: 200,
      confidence: "good",
      plantCount: 5,
      versionLabel: "Draft 1",
    },
  };
}

describe("localProjectStore", () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  });

  it("saves a project and lists it back", async () => {
    const saved = await localProjectStore.saveProjectWithVersion(input("Privacy hedge"));
    expect(saved.id).toBeTruthy();
    expect(saved.label).toBe("Privacy hedge");

    const projects = await localProjectStore.listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].intake.goal).toBe("privacy");
  });

  it("dedupes identical inputs (delegating to plansStore)", async () => {
    const a = await localProjectStore.saveProjectWithVersion(input("Hedge"));
    const b = await localProjectStore.saveProjectWithVersion(input("Hedge"));
    expect(b.id).toBe(a.id);
    expect(await localProjectStore.listProjects()).toHaveLength(1);
  });

  it("derives a single plan version per project", async () => {
    const saved = await localProjectStore.saveProjectWithVersion(input("Hedge"));
    const versions = await localProjectStore.listPlanVersions(saved.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].versionLabel).toBe("Draft 1");
    expect(await localProjectStore.comparePlanVersions(saved.id, "x", "y")).toBeNull();
  });

  it("deletes a project", async () => {
    const saved = await localProjectStore.saveProjectWithVersion(input("Hedge"));
    await localProjectStore.deleteProject(saved.id);
    expect(await localProjectStore.getProject(saved.id)).toBeNull();
    expect(await localProjectStore.listProjects()).toHaveLength(0);
  });

  it("reports local mode", () => {
    expect(localProjectStore.mode).toBe("local");
  });
});
