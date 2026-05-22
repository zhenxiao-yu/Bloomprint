"use client";

/**
 * Tiny pill showing where the user's plans are saved. Honest by default: "Saved on this device"
 * unless signed into cloud sync. Renders only when Supabase is configured (otherwise the
 * device-only model needs no badge).
 */
import { syncLabel, useStores } from "@/lib/storage";

export function SyncStatusBadge() {
  const { configured, mode, loading } = useStores();
  if (!configured || loading) return null;
  const cloud = mode === "cloud";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        cloud ? "bg-brand-soft text-brand-strong" : "bg-surface text-muted"
      }`}
      title={cloud ? "Your plans sync across devices." : "Sign in on the Account page to sync across devices."}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${cloud ? "bg-brand" : "bg-muted"}`} aria-hidden />
      {syncLabel(mode)}
    </span>
  );
}
