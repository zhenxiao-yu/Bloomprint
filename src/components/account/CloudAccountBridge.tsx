"use client";

/**
 * Mirrors the Supabase session into the device account (accountStore) so the rest of the
 * app — which reads `useAccount()` — recognizes a signed-in cloud user. Without this, a
 * successful Google login leaves the device account empty and the UI keeps showing the
 * "create an account" prompts. Renders nothing; mounted once in the locale layout.
 */
import { useEffect } from "react";
import { syncCloudAccount } from "@/lib/accountStore";
import { useSupabaseSession } from "@/lib/supabase/useSession";

export function CloudAccountBridge() {
  const { configured, status, user } = useSupabaseSession();

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const id = user?.id ?? null;
  const email = user?.email ?? undefined;
  const name =
    typeof meta.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta.name === "string" && meta.name.trim()
        ? meta.name.trim()
        : (email?.split("@")[0] ?? "Gardener");
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    undefined;

  useEffect(() => {
    // Wait for the initial session check; never act while the answer is unknown.
    if (!configured || status !== "ready") return;
    syncCloudAccount(id ? { id, name, email, avatarUrl: avatarUrl || undefined } : null);
  }, [configured, status, id, name, email, avatarUrl]);

  return null;
}
