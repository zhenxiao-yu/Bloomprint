/**
 * Live plan enrichment endpoint (optional, mock-first, never blocking).
 * GET  → { enabled } (true only when a REAL provider is configured).
 * POST → slim plan summary → LivePlanEnrichment (price estimates, weather timing,
 *        plant care, invasive caution). Always returns a valid payload; the
 *        deterministic plan stands on its own if this is slow or fails.
 */
import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getLiveEnrichment, realProvidersConfigured } from "@/lib/live-data";
import { EnrichPlanRequest, LIVE_DISCLAIMER } from "@/lib/live-data/schema";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({ enabled: realProvidersConfigured() });
}

export async function POST(request: Request) {
  const rl = rateLimit(`${clientIp(request)}:live`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many live-data requests — please wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = EnrichPlanRequest.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const enrichment = await getLiveEnrichment(parsed.data);
    return NextResponse.json(enrichment);
  } catch (error) {
    // getLiveEnrichment already degrades internally; this is a final safety net.
    console.error("Bloomprint live enrichment failed", error);
    return NextResponse.json({
      enabled: false,
      generatedAt: new Date().toISOString(),
      storeReality: [],
      weather: null,
      plantFacts: [],
      invasive: [],
      disclaimer: LIVE_DISCLAIMER,
    });
  }
}
