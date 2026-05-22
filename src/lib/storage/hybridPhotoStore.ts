/**
 * Hybrid photo store. Cloud (private bucket) when signed in + configured, otherwise on-device.
 * Cloud upload failures fall back to local so a photo is never lost to a network error — and the
 * "stays in your browser" promise still holds whenever the user is signed out.
 */
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { localPhotoStore } from "./localPhotoStore";
import { createSupabasePhotoStore } from "./supabasePhotoStore";
import { withFallback, type FallbackHandler } from "./fallback";
import type { PhotoStore } from "./types";

export function createHybridPhotoStore(
  userId: string | null,
  onFallback?: FallbackHandler,
): PhotoStore {
  if (!userId || !isSupabaseConfigured()) return localPhotoStore;
  const cloud = createSupabasePhotoStore(userId);
  const local = localPhotoStore;

  return {
    mode: "cloud",
    saveProjectPhoto: (projectId, dataUrl) =>
      withFallback(
        () => cloud.saveProjectPhoto(projectId, dataUrl),
        () => local.saveProjectPhoto(projectId, dataUrl),
        onFallback,
      ),
    getProjectPhotoUrl: (projectId, ref) =>
      withFallback(
        () => cloud.getProjectPhotoUrl(projectId, ref),
        () => local.getProjectPhotoUrl(projectId, ref),
        onFallback,
      ),
    deleteProjectPhoto: (projectId, ref) =>
      withFallback(
        () => cloud.deleteProjectPhoto(projectId, ref),
        () => local.deleteProjectPhoto(projectId, ref),
        onFallback,
      ),
  };
}
