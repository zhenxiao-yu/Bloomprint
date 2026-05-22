"use client";

import { useState } from "react";
import Link from "next/link";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { useEntitlements } from "@/lib/billing/useEntitlements";
import { PLANS } from "@/lib/billing/plans";

export function BillingStatus() {
  const { session } = useSupabaseSession();
  const { planKey, status, billingEnabled, cancelAtPeriodEnd, loading } = useEntitlements();
  const [busy, setBusy] = useState(false);

  if (loading) return <div className="card p-4"><div className="skeleton h-5 w-32" /></div>;

  async function manage() {
    const token = session?.access_token;
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch("/api/billing/create-portal-session", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  const plan = PLANS[planKey];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {plan.name} plan
            {planKey !== "free" ? <span className="ml-2 text-xs font-normal text-muted">({status})</span> : null}
          </p>
          {cancelAtPeriodEnd ? (
            <p className="text-xs text-[var(--warn)]">Cancels at period end.</p>
          ) : (
            <p className="text-xs text-muted">{plan.blurb}</p>
          )}
        </div>
        {planKey === "free" ? (
          <Link
            href="/pricing"
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong hover:bg-brand-strong"
          >
            See plans
          </Link>
        ) : billingEnabled ? (
          <button
            onClick={manage}
            disabled={busy}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand disabled:opacity-50"
          >
            {busy ? "Opening…" : "Manage billing"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
