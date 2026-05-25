/**
 * Connect local data to the cloud account after login.
 *
 * When a user signs into cloud sync and still has plans saved only on this device
 * (src/lib/plansStore.ts), this helper pushes those local `SavedPlan`s into their cloud
 * account via the existing `ProjectStore.saveProjectWithVersion` API.
 *
 * Contract (project rules):
 * - Non-destructive: this NEVER deletes or mutates local plans. It only adds to the cloud.
 * - Idempotent-ish: before syncing it lists existing cloud projects and skips any local plan
 *   whose label already exists in the cloud, so re-running won't pile up duplicates. (Labels are
 *   the only cheaply comparable key the store exposes — intake/adjustments aren't indexed.)
 * - Honest: it syncs only what local actually persists — label, versionLabel, intake, adjustments
 *   and the display summary. It does NOT send the rendered snapshots
 *   (`deterministicPlan`/`aiEnhancement`/`scores`/`evidence`) that PlanExperience attaches on a
 *   fresh save, because regenerating those would require an extra `/api/plan` round-trip per plan.
 *   That's fine: the cloud store regenerates the deterministic plan from intake+adjustments on
 *   load, exactly like the local store does (docs/DECISIONS.md D10). Snapshots are a load-speed
 *   optimization, not data — nothing is lost.
 */
import type { ProjectStore, SaveProjectInput } from "./types";
import type { SavedPlan } from "@/lib/plansStore";

export interface MigrationResult {
  /** Plans newly written to the cloud. */
  synced: number;
  /** Plans that threw while saving (stayed safe on-device). */
  failed: number;
  /** Plans skipped because a cloud project with the same label already exists. */
  skipped: number;
}

/** Minimal store surface this helper needs — keeps it easy to test/mock. */
type MigratableProjectStore = Pick<ProjectStore, "listProjects" | "saveProjectWithVersion">;

function toSaveInput(plan: SavedPlan): SaveProjectInput {
  return {
    label: plan.label,
    // SavedPlan keeps the version label inside its summary; fall back to a sensible default.
    versionLabel: plan.summary.versionLabel ?? "Draft 1",
    intake: plan.intake,
    adjustments: plan.adjustments,
    summary: plan.summary,
    // Rendered snapshots are intentionally omitted — see file header. The cloud store
    // regenerates the plan from intake + adjustments on load.
  };
}

/**
 * Push device-only plans into the signed-in user's cloud account.
 *
 * @param stores  the hybrid stores (or just its `projects` store) from `useStores()`. Pass this
 *                only when `stores.mode === "cloud"`; otherwise saves would land back on-device.
 * @param localPlans  the device's saved plans, e.g. from `useSavedPlans()`.
 */
export async function migrateLocalPlansToCloud(
  stores: { projects: MigratableProjectStore } | MigratableProjectStore,
  localPlans: SavedPlan[],
): Promise<MigrationResult> {
  const projects = "projects" in stores ? stores.projects : stores;
  const result: MigrationResult = { synced: 0, failed: 0, skipped: 0 };

  if (localPlans.length === 0) return result;

  // Cheap duplicate guard: skip local plans whose label already exists in the cloud.
  // If listing fails (offline), we don't block — we sync additively and let identical
  // re-runs be the user's call. saveProjectWithVersion itself never destroys anything.
  let existingLabels = new Set<string>();
  try {
    const existing = await projects.listProjects();
    existingLabels = new Set(existing.map((p) => p.label));
  } catch {
    /* couldn't list — proceed additively */
  }

  for (const plan of localPlans) {
    if (existingLabels.has(plan.label)) {
      result.skipped += 1;
      continue;
    }
    try {
      await projects.saveProjectWithVersion(toSaveInput(plan));
      // Track within this run so two local plans sharing a label don't both write.
      existingLabels.add(plan.label);
      result.synced += 1;
    } catch {
      // Hybrid store already falls back to local + flags a sync warning; count it and move on.
      result.failed += 1;
    }
  }

  return result;
}
