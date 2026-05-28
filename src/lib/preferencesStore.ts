"use client";

import { useSyncExternalStore } from "react";

/**
 * Device-local app preferences — the powerful settings layer behind the gear icon.
 *
 * Everything here lives in localStorage only (no account, no Supabase, no backend),
 * matching Bloomprint's "never block on auth/cloud" rule. Appearance prefs
 * (font scale / motion / contrast / tap size) are applied to <html> via data-*
 * attributes so CSS can react instantly, and a pre-paint script (PreferencesScript)
 * sets the same attributes before hydration to avoid a flash.
 */

export type FontScale = "compact" | "default" | "comfortable" | "large";
export type Units = "imperial" | "metric";
export type Currency = "USD" | "CAD";
export type Consent = "all" | "essential";

export interface Preferences {
  /** Scales the root rem so the whole UI grows/shrinks. */
  fontScale: FontScale;
  /** Kill non-essential animation for vestibular comfort / focus. */
  reduceMotion: boolean;
  /** Stronger borders + text contrast on top of the active theme. */
  highContrast: boolean;
  /** Enforce ≥44px tap targets on interactive controls. */
  largeTapTargets: boolean;
  /** Measurement system used across the planner + toolbox. */
  units: Units;
  /** Currency shown on prices (display only — never a quote). */
  currency: Currency;
  /** Product analytics on/off (gates Vercel Analytics). */
  analytics: boolean;
  /** null until the user has answered the consent prompt. */
  consent: Consent | null;
  /** ISO timestamp of the last consent decision, for the privacy record. */
  consentAt: string | null;
}

export const STORAGE_KEY = "bloomprint:v1:preferences";

export const DEFAULT_PREFERENCES: Preferences = {
  fontScale: "default",
  reduceMotion: false,
  highContrast: false,
  largeTapTargets: false,
  units: "imperial",
  currency: "USD",
  analytics: true,
  consent: null,
  consentAt: null,
};

const listeners = new Set<() => void>();
let cache: Preferences | null = null;

function readFromStorage(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getSnapshot(): Preferences {
  if (cache === null) cache = readFromStorage();
  return cache;
}

function getServerSnapshot(): Preferences {
  return DEFAULT_PREFERENCES;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  for (const listener of listeners) listener();
}

/** Apply appearance preferences to the document root so CSS can respond. */
export function applyPreferences(prefs: Preferences) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  // Text-size scaling was removed from Settings; pin to the neutral baseline so any
  // previously-stored scale no longer affects the document.
  el.dataset.fontScale = "default";
  el.dataset.reduceMotion = String(prefs.reduceMotion);
  el.dataset.contrast = prefs.highContrast ? "high" : "normal";
  el.dataset.tap = prefs.largeTapTargets ? "large" : "normal";
}

/** Merge a patch into preferences, persist, apply, and notify subscribers. */
export function setPreferences(patch: Partial<Preferences>) {
  const next: Preferences = { ...getSnapshot(), ...patch };
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage is best-effort (private mode / quota) — in-memory still updates.
  }
  applyPreferences(next);
  emit();
}

/** Record a cookie/analytics consent decision. */
export function recordConsent(consent: Consent) {
  setPreferences({
    consent,
    consentAt: new Date().toISOString(),
    analytics: consent === "all",
  });
}

/** Restore factory defaults (keeps saved plans + account untouched). */
export function resetPreferences() {
  setPreferences({ ...DEFAULT_PREFERENCES });
}

/** Subscribe to preference changes (React store contract). */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
