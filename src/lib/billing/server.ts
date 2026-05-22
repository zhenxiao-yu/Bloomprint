/**
 * Server-side billing helpers — authoritative entitlement + usage logic (spec: never trust the
 * client). All of this degrades safely: no Supabase service key → no rows → Free entitlements;
 * no Stripe → billing simply unavailable. Server-only (guarded by the service client).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  FREE_ENTITLEMENTS,
  resolveEntitlements,
  type Entitlements,
  type PlanKey,
} from "@/lib/billing/plans";
import type { LimitMetric } from "@/lib/billing/entitlements";

/** Untyped view of the service client for the billing tables (not in generated types). */
function billingDb(): SupabaseClient | null {
  return getSupabaseServiceClient() as unknown as SupabaseClient | null;
}

export interface SubscriptionRow {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_key: PlanKey;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/** Resolve a Supabase user id from a Bearer access token (browser sessions live in localStorage). */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const svc = getSupabaseServiceClient();
  if (!svc) return null;
  const { data } = await svc.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function getSubscriptionForUser(userId: string): Promise<SubscriptionRow | null> {
  const db = billingDb();
  if (!db) return null;
  const { data } = await db
    .from("subscriptions")
    .select("user_id,stripe_customer_id,stripe_subscription_id,plan_key,status,current_period_end,cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

export interface BillingState {
  planKey: PlanKey;
  status: string;
  entitlements: Entitlements;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}

export async function getBillingState(userId: string | null): Promise<BillingState> {
  if (!userId) {
    return { planKey: "free", status: "inactive", entitlements: FREE_ENTITLEMENTS, cancelAtPeriodEnd: false, currentPeriodEnd: null };
  }
  const row = await getSubscriptionForUser(userId);
  const planKey = row?.plan_key ?? "free";
  const status = row?.status ?? "inactive";
  return {
    planKey,
    status,
    entitlements: resolveEntitlements(planKey, status),
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
    currentPeriodEnd: row?.current_period_end ?? null,
  };
}

/* ----------------------------- usage counters ----------------------------- */

export function currentPeriodKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const USAGE_METRIC: Record<LimitMetric, string> = {
  projects: "projects",
  planVersions: "plan_versions",
  cloudPhotos: "cloud_photos",
  aiRefinements: "ai_refinements",
};

export async function getUsage(userId: string, metric: LimitMetric): Promise<number> {
  const db = billingDb();
  if (!db) return 0;
  const { data } = await db
    .from("usage_counters")
    .select("value")
    .eq("user_id", userId)
    .eq("period_key", currentPeriodKey())
    .eq("metric", USAGE_METRIC[metric])
    .maybeSingle();
  return (data as { value: number } | null)?.value ?? 0;
}

export async function incrementUsage(userId: string, metric: LimitMetric, by = 1): Promise<void> {
  const db = billingDb();
  if (!db) return;
  const period = currentPeriodKey();
  const m = USAGE_METRIC[metric];
  const current = await getUsage(userId, metric);
  await db
    .from("usage_counters")
    .upsert(
      { user_id: userId, period_key: period, metric: m, value: current + by, updated_at: new Date().toISOString() },
      { onConflict: "user_id,period_key,metric" },
    );
}

/* ----------------------------- subscription writes (webhook) -------------- */

export async function upsertCustomer(userId: string, stripeCustomerId: string): Promise<void> {
  const db = billingDb();
  if (!db) return;
  await db
    .from("billing_customers")
    .upsert({ user_id: userId, stripe_customer_id: stripeCustomerId }, { onConflict: "user_id" });
}

export async function findUserIdByCustomer(stripeCustomerId: string): Promise<string | null> {
  const db = billingDb();
  if (!db) return null;
  const { data } = await db
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  return (data as { user_id: string } | null)?.user_id ?? null;
}

export async function upsertSubscription(row: Partial<SubscriptionRow> & { user_id: string }): Promise<void> {
  const db = billingDb();
  if (!db) return;
  await db
    .from("subscriptions")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
}
