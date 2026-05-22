/**
 * Claude provider (optional) — calls the Anthropic Messages API to rephrase the deterministic
 * plan. It is presentation-only: the system prompt forbids inventing facts, and the response is
 * Zod-validated. ANY failure (no key, network, bad JSON, schema mismatch) returns null so the
 * caller falls back to the deterministic narrative. No SDK dependency — uses fetch.
 *
 * Prompt caching: the long, static system prompt is marked cache_control so repeated calls reuse
 * it (see the claude-api skill guidance).
 */
import { AIPlanEnhancement, type DeterministicPlan } from "@/domain/models";
import type { AIProvider } from "@/ai/provider";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are Bloomprint's presentation layer. You receive a finished, deterministic yard plan and rewrite it more warmly and clearly for a homeowner and for garden-center staff.

ABSOLUTE RULES:
- You may ONLY rephrase and summarize. You must NOT invent or change any fact: no new plants, prices, quantities, spacing, hardiness, toxicity, labor, or risks.
- Use only plants, numbers, and risks present in the provided plan.
- Keep prices as the ranges given. Never state an exact price.
- Be encouraging and concrete; never judgmental.

Respond with ONLY a JSON object (no markdown, no prose) matching this shape, all fields optional:
{
  "conceptName": string,
  "homeownerExplanation": string,
  "refinedNarrative": string,
  "staffTalkingPoints": string[],
  "alternatives": string[],
  "imagePrompt": string,
  "whyNot": string[],
  "simplifiedSummary": string
}`;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export class ClaudeProvider implements AIProvider {
  readonly name = "claude" as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string = process.env.AI_MODEL ?? DEFAULT_MODEL,
  ) {}

  async enhancePlan(plan: DeterministicPlan): Promise<AIPlanEnhancement | null> {
    if (!this.apiKey) return null;
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [
            {
              role: "user",
              content: `Here is the plan to present (JSON). Return only the enhancement JSON.\n\n${JSON.stringify(
                {
                  styleLabel: plan.styleLabel,
                  goal: plan.intake.goal,
                  insight: plan.insight,
                  narrative: plan.narrative,
                  plants: plan.plants.map((p) => ({ name: p.commonName, qty: p.quantity })),
                  diyTotal: plan.budget.diyTotal,
                  effort: plan.visualSummary.expectedEffort,
                  risks: plan.risks.map((r) => ({ message: r.message, mitigation: r.mitigation })),
                },
              )}`,
            },
          ],
        }),
      });

      if (!res.ok) return null;
      const data: unknown = await res.json();
      const text = readText(data);
      if (!text) return null;

      const parsed = AIPlanEnhancement.safeParse(JSON.parse(extractJson(text)));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}

function readText(data: unknown): string | null {
  if (
    data &&
    typeof data === "object" &&
    "content" in data &&
    Array.isArray((data as { content: unknown[] }).content)
  ) {
    const block = (data as { content: Array<{ type?: string; text?: string }> }).content.find(
      (b) => b.type === "text" && typeof b.text === "string",
    );
    return block?.text ?? null;
  }
  return null;
}
