import { AIPlanEnhancement, type DeterministicPlan, type PlanProvider } from "@/domain/models";
import type { AIProvider } from "@/ai/provider";
import { summarizePlanForAi } from "@/ai/promptCache";

interface GenericProviderOptions {
  name: Exclude<PlanProvider, "mock" | "none" | "claude">;
  apiKey?: string | null;
  endpoint?: string;
  model?: string;
}

const SYSTEM = `You are Bloomprint's presentation layer. You receive a finished, deterministic yard plan and rewrite it more warmly and clearly for a homeowner and garden-center staff.

ABSOLUTE RULES:
- You may ONLY rephrase and summarize. Do NOT invent or change any fact: no new plants, prices, quantities, spacing, hardiness, toxicity, labor, availability, or risks.
- Use only the plants, numbers, and risks present in the provided plan. Keep prices as the ranges given; never state an exact price.
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

export class GenericHttpProvider implements AIProvider {
  readonly name: GenericProviderOptions["name"];

  constructor(private readonly options: GenericProviderOptions) {
    this.name = options.name;
  }

  async enhancePlan(plan: DeterministicPlan): Promise<AIPlanEnhancement | null> {
    if (this.name !== "ollama" && !this.options.apiKey) return null;
    if (!this.options.endpoint) return null;
    try {
      const res = await fetch(this.options.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.options.apiKey ? { authorization: `Bearer ${this.options.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.options.model,
          // Cap output so a runaway response can't inflate cost; the enhancement is short.
          max_tokens: 700,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: JSON.stringify(summarizePlanForAi(plan)) },
          ],
          stream: false,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
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
  if (data && typeof data === "object") {
    const obj = data as { choices?: Array<{ message?: { content?: string } }>; message?: { content?: string }; response?: string };
    return obj.choices?.[0]?.message?.content ?? obj.message?.content ?? obj.response ?? null;
  }
  return null;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}
