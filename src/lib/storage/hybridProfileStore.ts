/**
 * Hybrid profile store. Cloud when signed in + configured, otherwise local; cloud failures fall
 * back to the on-device profile so personalization never blocks (docs/DECISIONS.md D5).
 */
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { localProfileStore } from "./localProfileStore";
import { createSupabaseProfileStore } from "./supabaseProfileStore";
import { withFallback, type FallbackHandler } from "./fallback";
import type { ProfileStore } from "./types";

export function createHybridProfileStore(
  userId: string | null,
  onFallback?: FallbackHandler,
): ProfileStore {
  if (!userId || !isSupabaseConfigured()) return localProfileStore;
  const cloud = createSupabaseProfileStore(userId);
  const local = localProfileStore;

  return {
    mode: "cloud",
    getProfile: () => withFallback(() => cloud.getProfile(), () => local.getProfile(), onFallback),
    saveProfile: (p) => withFallback(() => cloud.saveProfile(p), () => local.saveProfile(p), onFallback),
    getPropertyProfile: () =>
      withFallback(() => cloud.getPropertyProfile(), () => local.getPropertyProfile(), onFallback),
    savePropertyProfile: (p) =>
      withFallback(() => cloud.savePropertyProfile(p), () => local.savePropertyProfile(p), onFallback),
  };
}
