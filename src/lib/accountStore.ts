/**
 * Account store — a lightweight, device-local account (localStorage), read via useSyncExternalStore
 * (same SSR-safe pattern as profileStore/plansStore).
 *
 * This is intentionally a *device account*, not cloud auth: it gives create/manage/sign-out and a
 * home for the user's profile + saved plans, with no backend. The seam is deliberate — a future
 * cloud provider (Clerk/Supabase/etc.) can replace this module's read/write functions without the
 * rest of the app changing. See docs/DECISIONS.md.
 */
import { useMemo, useSyncExternalStore } from "react";

const KEY = "bloomprint:v1:account";

export interface Account {
  id: string;
  name: string;
  email?: string;
  createdAt: number;
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

function write(account: Account | null): void {
  try {
    if (account) localStorage.setItem(KEY, JSON.stringify(account));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
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

function current(): Account | null {
  const raw = read();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Account;
  } catch {
    return null;
  }
}

/** The signed-in device account, or null. Re-renders on change. */
export function useAccount(): Account | null {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Account;
    } catch {
      return null;
    }
  }, [raw]);
}

export function createAccount(input: { name: string; email?: string }): Account {
  const account: Account = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email?.trim() || undefined,
    createdAt: Date.now(),
  };
  write(account);
  return account;
}

export function updateAccount(patch: Partial<Pick<Account, "name" | "email">>): void {
  const acc = current();
  if (!acc) return;
  write({
    ...acc,
    ...("name" in patch ? { name: (patch.name ?? acc.name).trim() } : {}),
    ...("email" in patch ? { email: patch.email?.trim() || undefined } : {}),
  });
}

export function signOut(): void {
  write(null);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
