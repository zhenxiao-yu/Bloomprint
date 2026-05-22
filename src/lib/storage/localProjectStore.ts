/**
 * Local project store — a thin async wrapper over the existing on-device saved-plans store
 * (src/lib/plansStore.ts). It reads and writes the *same* localStorage key and `SavedPlan` shape,
 * so the existing `useSavedPlans` hook (account + plans pages) keeps working untouched.
 *
 * On-device we keep one version per project (D10: plans are regenerable from inputs), so version
 * history collapses to a single derived version and `comparePlanVersions` returns null — the plans
 * page already compares across projects.
 */
import {
  deletePlan,
  getSavedPlan,
  listSavedPlans,
  savePlan,
  type SavedPlan,
} from "@/lib/plansStore";
import type { ProjectStore, SaveProjectInput, StoredPlanVersion, StoredProject } from "./types";

function toProject(p: SavedPlan): StoredProject {
  return {
    id: p.id,
    label: p.label,
    intake: p.intake,
    adjustments: p.adjustments,
    summary: p.summary,
    currentVersionId: p.id, // single local version shares the project id
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
  };
}

function toVersion(p: SavedPlan): StoredPlanVersion {
  return {
    id: p.id,
    projectId: p.id,
    versionLabel: p.summary.versionLabel ?? p.label,
    intake: p.intake,
    adjustments: p.adjustments,
    summary: p.summary,
    createdAt: p.createdAt,
  };
}

export const localProjectStore: ProjectStore = {
  mode: "local",

  async listProjects() {
    return listSavedPlans().map(toProject);
  },

  async getProject(projectId) {
    const p = getSavedPlan(projectId);
    return p ? toProject(p) : null;
  },

  async saveProjectWithVersion(input: SaveProjectInput) {
    const saved = savePlan({
      label: input.label,
      intake: input.intake,
      adjustments: input.adjustments,
      summary: input.summary,
    });
    return toProject(saved);
  },

  async updateCurrentVersion() {
    // No-op on device: a single saved plan is its own current version.
  },

  async deleteProject(projectId) {
    deletePlan(projectId);
  },

  async listPlanVersions(projectId) {
    const p = getSavedPlan(projectId);
    return p ? [toVersion(p)] : [];
  },

  async comparePlanVersions() {
    // No multi-version history on device.
    return null;
  },
};
