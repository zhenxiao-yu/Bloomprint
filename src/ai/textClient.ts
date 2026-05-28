/**
 * Minimal server-only text-LLM client for bounded toolbox AI features. Calls the configured
 * DeepSeek (OpenAI-compatible) endpoint when a key is present and AI is enabled; otherwise
 * returns null so callers fall back to a deterministic, honest answer. Never used in client code.
 */
import { aiEnabled, keyFor } from "@/ai/costPolicy";

/** True when a DeepSeek key is configured and AI isn't globally disabled. */
export function textAiConfigured(): boolean {
  return aiEnabled() && Boolean(keyFor("deepseek"));
}

export async function generateText(args: {
  system: string;
  user: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string | null> {
  const apiKey = keyFor("deepseek");
  if (!aiEnabled() || !apiKey) return null;

  const endpoint = process.env.DEEPSEEK_API_URL ?? "https://api.deepseek.com/chat/completions";
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs ?? 12_000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: args.maxTokens ?? 600,
        temperature: 0.4,
        stream: false,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      message?: { content?: string };
      response?: string;
    };
    return data.choices?.[0]?.message?.content ?? data.message?.content ?? data.response ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the first {...} JSON object out of a model response (handles stray prose/markdown). */
export function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}
