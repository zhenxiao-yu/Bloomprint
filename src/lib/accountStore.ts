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

/** Who the person is, so plans and language can speak to their context. */
export const ACCOUNT_ROLES = ["homeowner", "pro", "retailer", "renter", "other"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export const MAX_BIO_LENGTH = 280;

export interface Account {
  id: string;
  name: string;
  email?: string;
  /** Profile photo URL (e.g. a Google avatar when signed in via cloud). */
  avatarUrl?: string;
  /** Self-identified role — drives nothing destructive; just tailors tone/context. */
  role?: AccountRole;
  /** Short free-text bio (≤ MAX_BIO_LENGTH chars). */
  bio?: string;
  /** "cloud" when mirrored from a Supabase session; "device" (or absent) for a local account. */
  source?: "cloud" | "device";
  createdAt: number;
}

/** Provider-agnostic identity the cloud bridge mirrors into the device account. */
export interface CloudIdentity {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
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
    source: "device",
    createdAt: Date.now(),
  };
  write(account);
  return account;
}

/**
 * Mirror a cloud session into the device account so the whole app (header, account page,
 * settings) recognizes a signed-in cloud user. Idempotent — only writes when something
 * changed, so it's safe to call on every session render. Passing `null` clears a
 * previously cloud-provisioned account but leaves a purely-local account untouched.
 */
export function syncCloudAccount(identity: CloudIdentity | null): void {
  const acc = current();
  if (identity) {
    if (
      acc &&
      acc.source === "cloud" &&
      acc.id === identity.id &&
      acc.name === identity.name &&
      acc.email === (identity.email || undefined) &&
      acc.avatarUrl === (identity.avatarUrl || undefined)
    ) {
      return; // already in sync — avoid a redundant write/notify
    }
    write({
      id: identity.id,
      name: identity.name,
      email: identity.email || undefined,
      avatarUrl: identity.avatarUrl || undefined,
      // Role and bio are edited locally — never clobber them on a cloud re-sync.
      role: acc?.role,
      bio: acc?.bio,
      source: "cloud",
      createdAt: acc?.createdAt ?? Date.now(),
    });
  } else if (acc?.source === "cloud") {
    write(null); // cloud signed out → remove the mirrored account
  }
}

export function updateAccount(
  patch: Partial<Pick<Account, "name" | "email" | "role" | "bio">>,
): void {
  const acc = current();
  if (!acc) return;
  write({
    ...acc,
    ...("name" in patch ? { name: (patch.name ?? acc.name).trim() } : {}),
    ...("email" in patch ? { email: patch.email?.trim() || undefined } : {}),
    ...("role" in patch ? { role: patch.role || undefined } : {}),
    ...("bio" in patch ? { bio: patch.bio?.trim().slice(0, MAX_BIO_LENGTH) || undefined } : {}),
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
