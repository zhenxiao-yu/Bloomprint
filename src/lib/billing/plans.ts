/**
 * Billing plans + entitlements (pure, framework-free — matches the domain-layer ethos, D8).
 *
 * The deterministic plan engine is NEVER gated — that's the hook (D1). Paid tiers unlock cloud
 * scale, convenience, staff workflows, and advanced evidence. Entitlements (not plan names) drive
 * every gate, so the rest of the app never branches on "which plan".
 */
export type PlanKey = "free" | "plus" | "pro";

export interface Entitlements {
  cloudSync: boolean;
  maxProjects: number;
  maxPlanVersions: number;
  maxCloudPhotos: number;
  aiRefinementsPerMonth: number;
  staffMode: boolean;
  advancedEvidence: boolean;
  exportPdf: boolean;
}

export interface PlanDef {
  key: PlanKey;
  name: string;
  monthlyUsd: number;
  blurb: string;
  highlights: string[];
  entitlements: Entitlements;
  /** Env var holding this plan's Stripe price id (paid plans only). */
  priceEnv?: "STRIPE_PRICE_PLUS_MONTHLY" | "STRIPE_PRICE_PRO_MONTHLY";
}

export const PLANS: Record<PlanKey, PlanDef> = {
  free: {
    key: "free",
    name: "Free",
    monthlyUsd: 0,
    blurb: "The full planning engine, free forever.",
    highlights: [
      "Unlimited plans on this device",
      "Save, share, compare, store mode",
      "3 cloud projects · 5 photos",
    ],
    entitlements: {
      cloudSync: true,
      maxProjects: 3,
      maxPlanVersions: 10,
      maxCloudPhotos: 5,
      aiRefinementsPerMonth: 0,
      staffMode: false,
      advancedEvidence: false,
      exportPdf: false,
    },
  },
  plus: {
    key: "plus",
    name: "Plus",
    monthlyUsd: 7,
    blurb: "For homeowners who want it all synced and exportable.",
    highlights: [
      "50 cloud projects · 100 photos",
      "Advanced evidence + PDF export",
      "50 AI-enhanced explanations / month",
    ],
    entitlements: {
      cloudSync: true,
      maxProjects: 50,
      maxPlanVersions: 200,
      maxCloudPhotos: 100,
      aiRefinementsPerMonth: 50,
      staffMode: false,
      advancedEvidence: true,
      exportPdf: true,
    },
    priceEnv: "STRIPE_PRICE_PLUS_MONTHLY",
  },
  pro: {
    key: "pro",
    name: "Pro",
    monthlyUsd: 19,
    blurb: "For serious DIYers and garden-center staff.",
    highlights: [
      "200 cloud projects · 500 photos",
      "Staff Helper + advanced evidence",
      "300 AI refinements / month",
    ],
    entitlements: {
      cloudSync: true,
      maxProjects: 200,
      maxPlanVersions: 1000,
      maxCloudPhotos: 500,
      aiRefinementsPerMonth: 300,
      staffMode: true,
      advancedEvidence: true,
      exportPdf: true,
    },
    priceEnv: "STRIPE_PRICE_PRO_MONTHLY",
  },
};

export const PLAN_ORDER: PlanKey[] = ["free", "plus", "pro"];

export const FREE_ENTITLEMENTS = PLANS.free.entitlements;

export function entitlementsForPlan(key: PlanKey): Entitlements {
  return PLANS[key]?.entitlements ?? FREE_ENTITLEMENTS;
}

/** Subscription statuses that grant the paid plan's entitlements. */
export function isActiveStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/** Resolve effective entitlements from a (plan, status) pair. Inactive → Free. */
export function resolveEntitlements(planKey: PlanKey, status: string | null | undefined): Entitlements {
  if (planKey === "free" || !isActiveStatus(status)) return FREE_ENTITLEMENTS;
  return entitlementsForPlan(planKey);
}

/** Map a Stripe price id back to a plan via env config. Unknown → free. */
export function planForPriceId(priceId: string | null | undefined): PlanKey {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PLUS_MONTHLY) return "plus";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro";
  return "free";
}

export function priceIdForPlan(key: PlanKey): string | null {
  const env = PLANS[key]?.priceEnv;
  return env ? (process.env[env] ?? null) : null;
}
