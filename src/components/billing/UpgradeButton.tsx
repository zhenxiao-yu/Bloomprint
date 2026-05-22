"use client";

import { useState } from "react";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { trackEvent } from "@/lib/analytics";

export function UpgradeButton({
  plan,
  billingEnabled,
  label,
}: {
  plan: "plus" | "pro";
  billingEnabled: boolean;
  label?: string;
}) {
  const { session } = useSupabaseSession();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!billingEnabled) {
    return <span className="text-xs text-muted">Upgrades coming soon</span>;
  }

  async function go() {
    const token = session?.access_token;
    if (!token) {
      window.location.href = "/signup?next=/pricing";
      return;
    }
    setBusy(true);
    setErr(null);
    trackEvent("upgrade_clicked", { plan });
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't start checkout.");
      window.location.href = data.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        onClick={go}
        disabled={busy}
        className="w-full rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong disabled:opacity-50"
      >
        {busy ? "Redirecting…" : (label ?? "Upgrade")}
      </button>
      {err ? <p className="mt-1 text-xs text-[var(--danger)]">{err}</p> : null}
    </div>
  );
}
