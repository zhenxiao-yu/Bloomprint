/**
 * POST /api/billing/create-portal-session — open Stripe's Customer Portal so users self-serve
 * (change card, cancel, view invoices). Requires a known Stripe customer for the signed-in user.
 */
import { NextResponse } from "next/server";
import { appUrl, getStripe, isBillingEnabled } from "@/lib/billing/stripe";
import { getSubscriptionForUser, getUserIdFromRequest } from "@/lib/billing/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!isBillingEnabled() || !stripe) {
    return NextResponse.json({ error: "Billing isn't enabled on this deployment." }, { status: 503 });
  }

  const userId = await getUserIdFromRequest(request).catch(() => null);
  if (!userId) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const sub = await getSubscriptionForUser(userId);
  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — upgrade first." }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl()}/account`,
  });

  return NextResponse.json({ url: session.url });
}
