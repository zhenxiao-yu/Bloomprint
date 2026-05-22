/**
 * Supabase profile store (cloud). The user profile blob lives in `profiles.user_data` keyed by the
 * auth user id; the property profile lives in `properties.data`. RLS scopes both to the user.
 */
import type { Json } from "@/types/supabase";
import { PropertyProfile } from "@/domain/models";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfileStore } from "./types";

const asJson = (v: unknown): Json => v as unknown as Json;

export function createSupabaseProfileStore(userId: string): ProfileStore {
  function db() {
    const client = getSupabaseBrowserClient();
    if (!client) throw new Error("Supabase is not configured.");
    return client;
  }

  return {
    mode: "cloud",

    async getProfile() {
      const { data, error } = await db()
        .from("profiles")
        .select("user_data")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      const blob = data?.user_data;
      return blob && typeof blob === "object" ? (blob as Record<string, unknown>) : null;
    },

    async saveProfile(profile) {
      const { error } = await db()
        .from("profiles")
        .upsert({ id: userId, user_data: asJson(profile), updated_at: new Date().toISOString() });
      if (error) throw error;
    },

    async getPropertyProfile() {
      const { data, error } = await db()
        .from("properties")
        .select("data")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data?.data) return null;
      const parsed = PropertyProfile.safeParse(data.data);
      return parsed.success ? parsed.data : null;
    },

    async savePropertyProfile(profile) {
      const client = db();
      const { data: existing } = await client
        .from("properties")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (existing) {
        const { error } = await client
          .from("properties")
          .update({ data: asJson(profile), updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await client
          .from("properties")
          .insert({ user_id: userId, data: asJson(profile) });
        if (error) throw error;
      }
    },
  };
}
