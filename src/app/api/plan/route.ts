/**
 * POST /api/plan — the single planning route (docs/DECISIONS.md D3).
 * Body: { intake?, fixtureKey?, adjustments? }. There is deliberately no raw-AI analyze route.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { RefinementAdjustment, YardIntake } from "@/domain/models";
import { FIXTURES } from "@/domain";
import { buildBloomprintPlan } from "@/lib/buildPlan";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
// LLM enhancement can be slow; give the function room (and never block the
// deterministic plan, which is returned even if enhancement times out).
export const maxDuration = 30;

const RequestBody = z
  .object({
    intake: YardIntake.optional(),
    fixtureKey: z.string().optional(),
    adjustments: z.array(RefinementAdjustment).optional(),
  })
  .refine((b) => b.intake || b.fixtureKey, {
    message: "Provide either `intake` or `fixtureKey`.",
  });

export async function POST(request: Request) {
  const rl = rateLimit(`${clientIp(request)}:plan`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests — please wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RequestBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { intake, fixtureKey, adjustments } = parsed.data;
  const resolvedIntake = intake ?? (fixtureKey ? FIXTURES[fixtureKey] : undefined);
  if (!resolvedIntake) {
    return NextResponse.json({ error: `Unknown fixture: ${fixtureKey}` }, { status: 400 });
  }

  try {
    const result = await buildBloomprintPlan(resolvedIntake, adjustments ?? []);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bloomprint plan build failed", error);
    return NextResponse.json(
      { error: "Bloomprint couldn't build that plan right now. Try again in a moment." },
      { status: 500 },
    );
  }
}
