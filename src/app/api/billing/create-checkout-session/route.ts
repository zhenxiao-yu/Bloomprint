/**
 * POST /api/billing/create-checkout-session — start a Stripe Checkout for a paid plan.
 * Body: { plan: "plus" | "pro" }. Requires Stripe configured + an authenticated user.
 * Reuses (or creates) the user's Stripe customer and records it in billing_customers.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { appUrl, getStripe, isBillingEnabled } from "@/lib/billing/stripe";
import { findUserIdByCustomer, getSubscriptionForUser, getUserIdFromRequest, upsertCustomer } from "@/lib/billing/server";
import { priceIdForPlan } from "@/lib/billing/plans";

export const runtime = "nodejs";

const Body = z.object({ plan: z.enum(["plus", "pro"]) });

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!isBillingEnabled() || !stripe) {
    return NextResponse.json({ error: "Billing isn't enabled on this deployment." }, { status: 503 });
  }

  const userId = await getUserIdFromRequest(request).catch(() => null);
  if (!userId) return NextResponse.json({ error: "Please sign in to upgrade." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a plan." }, { status: 400 });

  const priceId = priceIdForPlan(parsed.data.plan);
  if (!priceId) return NextResponse.json({ error: "That plan isn't configured." }, { status: 400 });

  // Reuse an existing Stripe customer if we have one for this user.
  const existing = await getSubscriptionForUser(userId);
  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ metadata: { userId } });
    customerId = customer.id;
    await upsertCustomer(userId, customerId);
  } else {
    // keep mapping fresh
    if (!(await findUserIdByCustomer(customerId))) await upsertCustomer(userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/account?billing=success`,
    cancel_url: `${appUrl()}/pricing?billing=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
