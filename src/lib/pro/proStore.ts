"use client";

/**
 * Pro workspace store — device-local clients & projects for landscapers, persisted
 * in localStorage and read via useSyncExternalStore (same SSR-safe, no-backend
 * pattern as src/lib/plansStore.ts). A project optionally links to a SavedPlan by
 * id; the deterministic plan is regenerated on demand from that plan's intake.
 * No accounts, no cloud — consistent with Bloomprint's "works offline" contract.
 */
import { useMemo, useSyncExternalStore } from "react";
import type { ShoppingItem, ShoppingPriority } from "@/domain/models";

const CLIENTS_KEY = "bloomprint:v1:pro-clients";
const PROJECTS_KEY = "bloomprint:v1:pro-projects";

export type ProStatus = "lead" | "quoted" | "approved" | "scheduled" | "in_progress" | "done";

/** Pipeline order, left → right. */
export const PRO_STATUSES: ProStatus[] = [
  "lead",
  "quoted",
  "approved",
  "scheduled",
  "in_progress",
  "done",
];

export const STATUS_LABEL: Record<ProStatus, string> = {
  lead: "Lead",
  quoted: "Quoted",
  approved: "Approved",
  scheduled: "Scheduled",
  in_progress: "In progress",
  done: "Done",
};

export interface ProClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProProject {
  id: string;
  title: string;
  clientId?: string;
  address?: string;
  regionId?: string;
  status: ProStatus;
  /** Epoch ms of the scheduled install date, if set. */
  scheduledFor?: number | null;
  /** Landscaper's own quoted price (their number, not an engine estimate). */
  priceQuoted?: number | null;
  /** Links to a SavedPlan (src/lib/plansStore) whose intake regenerates the plan. */
  savedPlanId?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

type Identified = { id: string; createdAt: number; updatedAt: number };

/** A localStorage-backed collection with the proven plansStore subscribe/snapshot wiring. */
function createCollection<T extends Identified>(key: string) {
  const listeners = new Set<() => void>();
  let cache: string | null = null;

  const read = (): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const parse = (raw: string | null): T[] => {
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? (data as T[]) : [];
    } catch {
      return [];
    }
  };
  const write = (items: T[]): void => {
    const serialized = JSON.stringify(items);
    try {
      localStorage.setItem(key, serialized);
    } catch {
      /* ignore quota / disabled storage */
    }
    cache = serialized;
    for (const l of listeners) l();
  };
  const subscribe = (cb: () => void): (() => void) => {
    listeners.add(cb);
    if (typeof window !== "undefined") window.addEventListener("storage", cb);
    return () => {
      listeners.delete(cb);
      if (typeof window !== "undefined") window.removeEventListener("storage", cb);
    };
  };
  const getSnapshot = (): string | null => {
    const v = read();
    if (v !== cache) cache = v;
    return cache;
  };
  const getServerSnapshot = (): string | null => null;

  return {
    useItems(): T[] {
      const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      return useMemo(() => parse(raw), [raw]);
    },
    list: (): T[] => parse(read()),
    set: write,
  };
}

const clientsCol = createCollection<ProClient>(CLIENTS_KEY);
const projectsCol = createCollection<ProProject>(PROJECTS_KEY);

export const useProClients = clientsCol.useItems;
export const useProProjects = projectsCol.useItems;
export const listProClients = clientsCol.list;
export const listProProjects = projectsCol.list;

// ---- Clients ----------------------------------------------------------------

export function addClient(input: { name: string; email?: string; phone?: string; notes?: string }): ProClient {
  const now = Date.now();
  const client: ProClient = {
    id: crypto.randomUUID(),
    name: input.name.trim() || "New client",
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  clientsCol.set([client, ...clientsCol.list()]);
  return client;
}

export function updateClient(id: string, patch: Partial<Omit<ProClient, "id" | "createdAt">>): void {
  clientsCol.set(
    clientsCol.list().map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c)),
  );
}

export function deleteClient(id: string): void {
  clientsCol.set(clientsCol.list().filter((c) => c.id !== id));
  // Detach the client from any projects rather than orphan-deleting the work.
  projectsCol.set(
    projectsCol.list().map((p) => (p.clientId === id ? { ...p, clientId: undefined, updatedAt: Date.now() } : p)),
  );
}

// ---- Projects ---------------------------------------------------------------

export function addProject(input: {
  title: string;
  clientId?: string;
  address?: string;
  regionId?: string;
  status?: ProStatus;
  scheduledFor?: number | null;
  priceQuoted?: number | null;
  savedPlanId?: string;
  notes?: string;
}): ProProject {
  const now = Date.now();
  const project: ProProject = {
    id: crypto.randomUUID(),
    title: input.title.trim() || "Untitled project",
    clientId: input.clientId,
    address: input.address?.trim() || undefined,
    regionId: input.regionId,
    status: input.status ?? "lead",
    scheduledFor: input.scheduledFor ?? null,
    priceQuoted: input.priceQuoted ?? null,
    savedPlanId: input.savedPlanId,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  projectsCol.set([project, ...projectsCol.list()]);
  return project;
}

export function updateProject(id: string, patch: Partial<Omit<ProProject, "id" | "createdAt">>): void {
  projectsCol.set(
    projectsCol.list().map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
  );
}

export function deleteProject(id: string): void {
  projectsCol.set(projectsCol.list().filter((p) => p.id !== id));
}

export function moveProject(id: string, status: ProStatus): void {
  updateProject(id, { status });
}

/** Wipe the whole device-local pro workspace (clients + projects). */
export function clearProWorkspace(): void {
  clientsCol.set([]);
  projectsCol.set([]);
}

/** Seed a small, clearly-removable sample workspace so an empty dashboard can be explored. */
export function seedSampleWorkspace(): void {
  if (clientsCol.list().length > 0 || projectsCol.list().length > 0) return;
  const zhang = addClient({ name: "Mrs. Zhang", email: "zhang@example.com", phone: "(905) 555-0142" });
  const patel = addClient({ name: "Patel family", email: "patel@example.com" });
  addProject({
    title: "Oakville front-yard refresh",
    clientId: zhang.id,
    address: "12 Maple Ave, Oakville",
    status: "quoted",
    priceQuoted: 2400,
    notes: "Curb appeal + low-water foundation beds.",
  });
  addProject({
    title: "Backyard shade bed",
    clientId: patel.id,
    status: "lead",
    notes: "Waiting on photos of the north fence line.",
  });
  addProject({
    title: "Driveway privacy strip",
    status: "scheduled",
    scheduledFor: Date.now() + 4 * 24 * 60 * 60 * 1000,
    priceQuoted: 1700,
  });
}

// ---- Pure helpers (unit-tested) --------------------------------------------

export interface ProStats {
  active: number;
  awaitingApproval: number;
  scheduledSoon: number;
  pipelineValue: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function proStats(projects: ProProject[], now = Date.now()): ProStats {
  return {
    active: projects.filter((p) => p.status !== "done").length,
    awaitingApproval: projects.filter((p) => p.status === "quoted").length,
    scheduledSoon: projects.filter(
      (p) =>
        p.status === "scheduled" &&
        typeof p.scheduledFor === "number" &&
        p.scheduledFor >= now &&
        p.scheduledFor <= now + WEEK_MS,
    ).length,
    pipelineValue: projects
      .filter((p) => p.status !== "done")
      .reduce((sum, p) => sum + (p.priceQuoted ?? 0), 0),
  };
}

export function groupByStatus(projects: ProProject[]): Record<ProStatus, ProProject[]> {
  const groups = Object.fromEntries(PRO_STATUSES.map((s) => [s, [] as ProProject[]])) as Record<
    ProStatus,
    ProProject[]
  >;
  for (const project of projects) (groups[project.status] ?? groups.lead).push(project);
  return groups;
}

export interface ConsolidatedItem {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  priceMin: number;
  priceMax: number;
  priority: ShoppingPriority;
  projectCount: number;
}

const PRIORITY_RANK: Record<ShoppingPriority, number> = {
  "buy-first": 0,
  "can-wait": 1,
  optional: 2,
};

/**
 * Merge shopping lists from several projects into one consolidated buy list:
 * same item (by name + unit + category) sums quantity and price range, keeps the
 * most urgent priority, and counts how many projects need it. Estimates, never a
 * quote — the UI keeps the verify-before-buying note.
 */
export function consolidateShoppingItems(
  perProject: { projectId: string; items: ShoppingItem[] }[],
): ConsolidatedItem[] {
  const map = new Map<string, ConsolidatedItem & { _projects: Set<string> }>();
  for (const { projectId, items } of perProject) {
    for (const it of items) {
      const key = `${it.name}|${it.unit}|${it.category}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += it.quantity;
        existing.priceMin += it.price.min;
        existing.priceMax += it.price.max;
        if (PRIORITY_RANK[it.priority] < PRIORITY_RANK[existing.priority]) existing.priority = it.priority;
        existing._projects.add(projectId);
      } else {
        map.set(key, {
          name: it.name,
          category: it.category,
          unit: it.unit,
          quantity: it.quantity,
          priceMin: it.price.min,
          priceMax: it.price.max,
          priority: it.priority,
          projectCount: 1,
          _projects: new Set([projectId]),
        });
      }
    }
  }
  return [...map.values()]
    .map(({ _projects, ...rest }) => ({ ...rest, projectCount: _projects.size }))
    .sort(
      (a, b) =>
        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.name.localeCompare(b.name),
    );
}
