"use client";

/**
 * Connect-local-data-to-account prompt. After a user signs into cloud sync, if they still have
 * plans saved only on this device, this card offers a one-tap sync into their account.
 *
 * Renders nothing unless: Supabase is configured, the user is signed in, the store is in cloud
 * mode, and there's at least one local plan. The sync is non-destructive — local plans always
 * stay put — and honest about failure (your plans remain safe on this device).
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useStores } from "@/lib/storage";
import { useSavedPlans } from "@/lib/plansStore";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { migrateLocalPlansToCloud } from "@/lib/storage/connectLocalToCloud";

type Status =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; synced: number; skipped: number }
  | { kind: "error" };

export function ConnectAccountCard() {
  const t = useTranslations("Account");
  const stores = useStores();
  const { configured, userId } = useSupabaseSession();
  const plans = useSavedPlans();
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const eligible = configured && Boolean(userId) && stores.mode === "cloud" && plans.length > 0;
  // Once a sync completes, keep the result visible even though `plans` may still report
  // device-only entries (local is never cleared) — the user already acted.
  if (!eligible && status.kind === "idle") return null;

  async function handleSync() {
    setStatus({ kind: "working" });
    try {
      const { synced, skipped } = await migrateLocalPlansToCloud(stores, plans);
      setStatus({ kind: "done", synced, skipped });
    } catch {
      setStatus({ kind: "error" });
    }
  }

  const working = status.kind === "working";

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-foreground">{t("connectTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("connectBody", { count: plans.length })}</p>

      {status.kind !== "done" ? (
        <button
          type="button"
          onClick={handleSync}
          disabled={working}
          className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong disabled:opacity-50"
        >
          {working ? t("connectSyncing") : t("connectSyncButton")}
        </button>
      ) : null}

      <p className="mt-3 text-sm" aria-live="polite">
        {status.kind === "done" ? (
          <span className="text-brand-strong">
            {status.skipped > 0
              ? t("connectSuccessWithSkipped", { synced: status.synced, skipped: status.skipped })
              : t("connectSuccess", { synced: status.synced })}
          </span>
        ) : null}
        {status.kind === "error" ? (
          <span className="text-[var(--danger)]">{t("connectError")}</span>
        ) : null}
      </p>
    </section>
  );
}
