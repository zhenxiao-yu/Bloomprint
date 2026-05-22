/**
 * GET /api/billing/status — the client's view of its entitlements. Always 200; resolves the user
 * from the Bearer token (optional) and returns Free when there's no user/subscription/config.
 * Authoritative checks still happen server-side at each gated write.
 */
import { NextResponse } from "next/server";
import { getBillingState, getUserIdFromRequest } from "@/lib/billing/server";
import { isBillingEnabled } from "@/lib/billing/stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request).catch(() => null);
  const state = await getBillingState(userId);
  return NextResponse.json({ billingEnabled: isBillingEnabled(), signedIn: Boolean(userId), ...state });
}
