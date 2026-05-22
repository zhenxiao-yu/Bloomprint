/**
 * Tiny localStorage-backed profile store read via useSyncExternalStore — the React-sanctioned way
 * to read client-only state without setState-in-effect or hydration mismatches (getServerSnapshot
 * returns null, so the server renders no saved profile and the client fills it in after hydration).
 */
import { useSyncExternalStore } from "react";

const KEY = "bloomprint:v1:profile";
const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
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
  if (v !== cache) cache = v; // keep a stable reference when unchanged
  return cache;
}

function getServerSnapshot(): string | null {
  return null;
}

/** Raw JSON string of the saved profile (or null). Re-renders when it changes. */
export function useSavedProfileRaw(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function saveProfile(value: unknown): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  for (const l of listeners) l();
}

/** Non-hook reader for the storage layer (parsed profile object, or null). */
export function readSavedProfile(): Record<string, unknown> | null {
  const raw = read();
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
