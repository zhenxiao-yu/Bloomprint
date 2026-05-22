import { AIPlanEnhancement, type DeterministicPlan, type PlanProvider } from "@/domain/models";
import type { AIProvider } from "@/ai/provider";
import { summarizePlanForAi } from "@/ai/promptCache";

interface GenericProviderOptions {
  name: Exclude<PlanProvider, "mock" | "none" | "claude">;
  apiKey?: string | null;
  endpoint?: string;
  model?: string;
}

const SYSTEM = `You are Bloomprint's presentation layer. Rephrase only. Do not invent or change plants, prices, quantities, spacing, hardiness, toxicity, labor, availability, or risks. Return JSON only.`;

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
