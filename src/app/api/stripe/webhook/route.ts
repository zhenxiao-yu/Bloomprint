/**
 * POST /api/stripe/webhook — provision access from Stripe subscription lifecycle events
 * (Stripe's recommended pattern). Verifies the signature, maps the Stripe customer to a Supabase
 * user, and writes the subscriptions row. Subscription writes happen ONLY here (server, service role).
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isBillingEnabled } from "@/lib/billing/stripe";
import { findUserIdByCustomer, upsertCustomer, upsertSubscription } from "@/lib/billing/server";
import { planForPriceId } from "@/lib/billing/plans";

export const runtime = "nodejs";

function periodEndIso(sub: Stripe.Subscription): string | null {
  const end = (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof end === "number" ? new Date(end * 1000).toISOString() : null;
}

async function syncSubscription(stripe: Stripe, sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const userId = await findUserIdByCustomer(customerId);
  if (!userId) return; // mapping not yet known; checkout.session.completed will create it
  const priceId = sub.items.data[0]?.price.id ?? null;
  const planKey = planForPriceId(priceId);
  await upsertSubscription({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    plan_key: sub.status === "canceled" ? "free" : planKey,
    status: sub.status,
    current_period_end: periodEndIso(sub),
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!isBillingEnabled() || !stripe || !secret) {
    return NextResponse.json({ error: "Billing not configured." }, { status: 503 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (userId && customerId) await upsertCustomer(userId, customerId);
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string" ? session.subscription : session.subscription.id,
          );
          await syncSubscription(stripe, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(stripe, event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string | { id: string } }).subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(typeof subId === "string" ? subId : subId.id);
          await syncSubscription(stripe, sub);
        }
        break;
      }
    }
  } catch {
    // Don't 500 to Stripe on a transient downstream error after a verified event.
    return NextResponse.json({ received: true, warning: "post-processing error" });
  }

  return NextResponse.json({ received: true });
}
