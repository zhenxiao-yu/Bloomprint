/**
 * Storage entry point for the UI. `useStores()` assembles the hybrid project/profile/photo stores
 * for the current auth session and exposes the sync mode + a non-blocking "couldn't sync" warning.
 *
 * Signed out or unconfigured → local stores ("Saved on this device"). Signed in + configured →
 * cloud stores ("Synced to cloud"), each falling back to local on error.
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { createHybridProjectStore } from "./hybridProjectStore";
import { createHybridProfileStore } from "./hybridProfileStore";
import { createHybridPhotoStore } from "./hybridPhotoStore";
import type { PhotoStore, ProfileStore, ProjectStore, SyncMode } from "./types";

export type { SyncMode } from "./types";

export interface Stores {
  mode: SyncMode;
  configured: boolean;
  signedIn: boolean;
  loading: boolean;
  syncWarning: string | null;
  clearSyncWarning: () => void;
  projects: ProjectStore;
  profiles: ProfileStore;
  photos: PhotoStore;
}

const SYNC_FAILED = "Couldn't reach the cloud — saved on this device for now.";

export function useStores(): Stores {
  const { userId, configured, status } = useSupabaseSession();
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const clearSyncWarning = useCallback(() => setSyncWarning(null), []);
  const onFallback = useCallback(() => setSyncWarning(SYNC_FAILED), []);

  const projects = useMemo(() => createHybridProjectStore(userId, onFallback), [userId, onFallback]);
  const profiles = useMemo(() => createHybridProfileStore(userId, onFallback), [userId, onFallback]);
  const photos = useMemo(() => createHybridPhotoStore(userId, onFallback), [userId, onFallback]);

  return {
    mode: projects.mode,
    configured,
    signedIn: Boolean(userId),
    loading: status === "loading",
    syncWarning,
    clearSyncWarning,
    projects,
    profiles,
    photos,
  };
}

/** Human label for the current sync mode — used by the badge and copy. */
export function syncLabel(mode: SyncMode): string {
  return mode === "cloud" ? "Synced to cloud" : "Saved on this device";
}
