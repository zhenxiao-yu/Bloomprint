/**
 * Saved-plans store — per-browser plan history in localStorage, read via useSyncExternalStore
 * (same SSR-safe pattern as src/lib/profileStore.ts). Stores only the inputs plus a small display
 * summary; the full plan is regenerated deterministically when opened. No backend, no accounts.
 */
import { useMemo, useSyncExternalStore } from "react";
import type { RefinementAdjustment, YardIntake } from "@/domain/models";

const KEY = "bloomprint:v1:plans";
const MAX = 25;

export interface SavedPlanSummary {
  styleLabel: string;
  goal: string;
  diyMin: number;
  diyMax: number;
  confidence: string;
  plantCount: number;
  laborHours?: number;
  privacy?: string;
  maintenance?: string;
  heavyWorkWarning?: boolean;
  versionLabel?: string;
}

export interface SavedPlan {
  id: string;
  label: string;
  intake: YardIntake;
  adjustments: RefinementAdjustment[];
  createdAt: number;
  summary: SavedPlanSummary;
}

const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(plans: SavedPlan[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
  } catch {
    /* ignore quota / disabled storage */
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): string | null {
  const v = read();
  if (v !== cache) cache = v;
  return cache;
}

function getServerSnapshot(): string | null {
  return null;
}

function parse(raw: string | null): SavedPlan[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? (data as SavedPlan[]) : [];
  } catch {
    return [];
  }
}

/** All saved plans, newest first. Stable reference unless the underlying string changes. */
export function useSavedPlans(): SavedPlan[] {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => parse(raw), [raw]);
}

function currentPlans(): SavedPlan[] {
  return parse(read());
}

function sameInputs(a: SavedPlan, intake: YardIntake, adjustments: RefinementAdjustment[]): boolean {
  return (
    JSON.stringify(a.intake) === JSON.stringify(intake) &&
    JSON.stringify([...a.adjustments].sort()) === JSON.stringify([...adjustments].sort())
  );
}

export function savePlan(entry: Omit<SavedPlan, "id" | "createdAt">): SavedPlan {
  const plans = currentPlans();
  const existing = plans.find((p) => sameInputs(p, entry.intake, entry.adjustments));
  if (existing) return existing; // dedupe identical inputs
  const saved: SavedPlan = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() };
  write([saved, ...plans].slice(0, MAX));
  return saved;
}

export function deletePlan(id: string): void {
  write(currentPlans().filter((p) => p.id !== id));
}

export function clearPlans(): void {
  write([]);
}

export function renamePlan(id: string, label: string): void {
  write(currentPlans().map((p) => (p.id === id ? { ...p, label } : p)));
}
