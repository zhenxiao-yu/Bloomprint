/**
 * Hybrid project store. Cloud when signed in + configured, otherwise local. Every cloud op falls
 * back to the on-device store on failure so sync issues never block saving or browsing plans.
 */
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { localProjectStore } from "./localProjectStore";
import { createSupabaseProjectStore } from "./supabaseProjectStore";
import { withFallback, type FallbackHandler } from "./fallback";
import type { ProjectStore } from "./types";

export function createHybridProjectStore(
  userId: string | null,
  onFallback?: FallbackHandler,
): ProjectStore {
  if (!userId || !isSupabaseConfigured()) return localProjectStore;
  const cloud = createSupabaseProjectStore(userId);
  const local = localProjectStore;

  return {
    mode: "cloud",
    listProjects: () => withFallback(() => cloud.listProjects(), () => local.listProjects(), onFallback),
    getProject: (id) => withFallback(() => cloud.getProject(id), () => local.getProject(id), onFallback),
    saveProjectWithVersion: (input) =>
      withFallback(() => cloud.saveProjectWithVersion(input), () => local.saveProjectWithVersion(input), onFallback),
    updateCurrentVersion: (projectId, versionId) =>
      withFallback(
        () => cloud.updateCurrentVersion(projectId, versionId),
        () => local.updateCurrentVersion(projectId, versionId),
        onFallback,
      ),
    deleteProject: (id) => withFallback(() => cloud.deleteProject(id), () => local.deleteProject(id), onFallback),
    listPlanVersions: (id) =>
      withFallback(() => cloud.listPlanVersions(id), () => local.listPlanVersions(id), onFallback),
    comparePlanVersions: (projectId, a, b) =>
      withFallback(
        () => cloud.comparePlanVersions(projectId, a, b),
        () => local.comparePlanVersions(projectId, a, b),
        onFallback,
      ),
  };
}
