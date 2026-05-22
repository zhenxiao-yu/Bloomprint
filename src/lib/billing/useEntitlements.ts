"use client";

import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/lib/supabase/useSession";
import { FREE_ENTITLEMENTS, type Entitlements, type PlanKey } from "@/lib/billing/plans";

export interface EntitlementsState {
  loading: boolean;
  billingEnabled: boolean;
  signedIn: boolean;
  planKey: PlanKey;
  status: string;
  entitlements: Entitlements;
  cancelAtPeriodEnd: boolean;
}

const DEFAULT: EntitlementsState = {
  loading: true,
  billingEnabled: false,
  signedIn: false,
  planKey: "free",
  status: "inactive",
  entitlements: FREE_ENTITLEMENTS,
  cancelAtPeriodEnd: false,
};

/** Client view of entitlements (resolved server-side). Authoritative checks live on the server. */
export function useEntitlements(): EntitlementsState {
  const { session } = useSupabaseSession();
  const token = session?.access_token;
  const [state, setState] = useState<EntitlementsState>(DEFAULT);

  useEffect(() => {
    let active = true;
    const headers: HeadersInit = token ? { authorization: `Bearer ${token}` } : {};
    fetch("/api/billing/status", { headers })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        setState({
          loading: false,
          billingEnabled: Boolean(d.billingEnabled),
          signedIn: Boolean(d.signedIn),
          planKey: (d.planKey as PlanKey) ?? "free",
          status: d.status ?? "inactive",
          entitlements: (d.entitlements as Entitlements) ?? FREE_ENTITLEMENTS,
          cancelAtPeriodEnd: Boolean(d.cancelAtPeriodEnd),
        });
      })
      .catch(() => active && setState((s) => ({ ...s, loading: false })));
    return () => {
      active = false;
    };
  }, [token]);

  return state;
}
