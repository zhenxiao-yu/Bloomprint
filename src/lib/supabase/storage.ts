/**
 * Private `project-photos` bucket helpers (browser client).
 *
 * Paths are always `userId/projectId/photoId.ext` — the leading user id is what the bucket's RLS
 * policy checks, so a user can only ever read/write their own photos. The bucket is private, so we
 * hand out short-lived signed URLs rather than public links.
 */
"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export const PHOTO_BUCKET = "project-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

/** Build the canonical storage path. Keep the user id first so RLS path checks pass. */
export function photoPath(userId: string, projectId: string, photoId: string, ext = "jpg"): string {
  return `${userId}/${projectId}/${photoId}.${ext}`;
}

/** Upload a data URL (the in-browser photo format) to the private bucket. Returns the path. */
export async function uploadPhotoDataUrl(
  userId: string,
  projectId: string,
  photoId: string,
  dataUrl: string,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const blob = await (await fetch(dataUrl)).blob();
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const path = photoPath(userId, projectId, photoId, ext);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

/** Short-lived signed URL for a stored photo, or null on failure. */
export async function getPhotoSignedUrl(path: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Remove a stored photo. Best-effort; ignores "not found". */
export async function removePhoto(path: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.storage.from(PHOTO_BUCKET).remove([path]);
}
