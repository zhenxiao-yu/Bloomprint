/**
 * POST /api/plan/ask — bounded section copilot (docs/DECISIONS.md D15, amends D4).
 *
 * Answers ONE question about ONE plan section. It explains; it never mutates the plan or invents
 * facts. Output is Zod-validated to { answer, suggestedRefinements (fixed vocabulary), disclaimer }.
 * Mock-first: works with no AI key. This is NOT a general chat endpoint and carries no conversation.
 */
import { NextResponse } from "next/server";
import { SectionQuestion, answerSectionQuestion } from "@/ai/sectionCopilot";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const rl = rateLimit(`${clientIp(request)}:ask`, 30, 60_000);
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

  const parsed = SectionQuestion.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const answer = await answerSectionQuestion(parsed.data);
    return NextResponse.json(answer);
  } catch (error) {
    console.error("Section copilot failed", error);
    return NextResponse.json(
      { error: "Couldn't answer that right now. Try a refinement chip instead." },
      { status: 500 },
    );
  }
}
