/**
 * Entitlement checks — the single source of "can the user do X?". Pure, so both the server
 * (enforcement) and the client (UI affordances) use the same logic. Server checks are authoritative;
 * client checks are only for showing/hiding upgrade prompts (spec: never trust client entitlements).
 */
import type { Entitlements } from "@/lib/billing/plans";

export type BooleanFeature = "cloudSync" | "staffMode" | "advancedEvidence" | "exportPdf";

export function canUseFeature(e: Entitlements, feature: BooleanFeature): boolean {
  return e[feature];
}

export function canCreateProject(e: Entitlements, currentCount: number): boolean {
  return currentCount < e.maxProjects;
}

export function canCreatePlanVersion(e: Entitlements, currentCount: number): boolean {
  return currentCount < e.maxPlanVersions;
}

export function canUploadPhoto(e: Entitlements, currentCount: number): boolean {
  return currentCount < e.maxCloudPhotos;
}

export function canUseAiRefinement(e: Entitlements, usedThisMonth: number): boolean {
  return usedThisMonth < e.aiRefinementsPerMonth;
}

export function remaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}

export type LimitMetric = "projects" | "planVersions" | "cloudPhotos" | "aiRefinements";

const LIMIT_FIELD: Record<LimitMetric, keyof Entitlements> = {
  projects: "maxProjects",
  planVersions: "maxPlanVersions",
  cloudPhotos: "maxCloudPhotos",
  aiRefinements: "aiRefinementsPerMonth",
};

export function limitFor(e: Entitlements, metric: LimitMetric): number {
  return e[LIMIT_FIELD[metric]] as number;
}

export function withinLimit(e: Entitlements, metric: LimitMetric, used: number): boolean {
  return used < limitFor(e, metric);
}
