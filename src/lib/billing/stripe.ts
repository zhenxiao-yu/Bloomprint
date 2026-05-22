/**
 * Stripe client — lazy and OPTIONAL. With no STRIPE_SECRET_KEY the app stays in Free/local mode
 * (spec: payment is never required). Server-only.
 */
import Stripe from "stripe";

let client: Stripe | null = null;

export function isBillingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://bloomprint.vercel.app";
}
