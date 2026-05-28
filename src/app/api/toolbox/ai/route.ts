/**
 * Bounded gardening Q&A endpoint (docs/DECISIONS.md D15). POST a single, length-capped question
 * → a Zod-validated answer. DeepSeek when configured, deterministic mock otherwise. Rate-limited
 * and transient (nothing stored).
 */
import { NextResponse } from "next/server";

import { GardenQuestion, answerGardenQuestion } from "@/ai/gardenQa";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(request: Request) {
  const rl = rateLimit(`${clientIp(request)}:toolbox-ai`, 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = GardenQuestion.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_question" }, { status: 400 });
  }

  try {
    return NextResponse.json(await answerGardenQuestion(parsed.data));
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
