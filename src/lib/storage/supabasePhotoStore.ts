/**
 * Supabase photo store (cloud). Uploads to the private `project-photos` bucket under
 * `userId/projectId/photoId.ext` and tracks the path in `project_photos`. The opaque reference
 * returned to the app *is* the storage path; resolving it yields a short-lived signed URL.
 */
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPhotoSignedUrl, removePhoto, uploadPhotoDataUrl } from "@/lib/supabase/storage";
import type { PhotoStore } from "./types";

export function createSupabasePhotoStore(userId: string): PhotoStore {
  function db() {
    const client = getSupabaseBrowserClient();
    if (!client) throw new Error("Supabase is not configured.");
    return client;
  }

  return {
    mode: "cloud",

    async saveProjectPhoto(projectId, dataUrl) {
      const photoId = crypto.randomUUID();
      const path = await uploadPhotoDataUrl(userId, projectId, photoId, dataUrl);
      const { error } = await db()
        .from("project_photos")
        .insert({ project_id: projectId, user_id: userId, storage_path: path });
      if (error) throw error;
      return path;
    },

    async getProjectPhotoUrl(_projectId, ref) {
      return getPhotoSignedUrl(ref);
    },

    async deleteProjectPhoto(_projectId, ref) {
      await removePhoto(ref);
      await db().from("project_photos").delete().eq("storage_path", ref);
    },
  };
}
