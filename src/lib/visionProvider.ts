/**
 * Optional yard-photo vision — OFF unless a vision key is configured. Two paths:
 *  - Claude (when AI_PROVIDER=claude + ANTHROPIC_API_KEY), or
 *  - any OpenAI-compatible vision-language model via VISION_API_KEY (e.g. SiliconFlow
 *    Qwen2.5-VL — cheap, Chinese). Set VISION_API_URL / VISION_MODEL to point it.
 *
 * It returns *confirmable estimates* (sun exposure + a few honest observations), never measurements
 * and never anything fed silently into the plan. The user reviews and applies suggestions; the
 * deterministic plan stays the source of truth (docs/DECISIONS.md D1/D2). Any failure → null.
 *
 * Cost control: identical photos are de-duped via an in-memory TTL cache (keyed by an image hash),
 * and output is capped with max_tokens, so re-clicking "Read Photo" doesn't re-bill.
 */
import { createHash } from "crypto";
import { z } from "zod";
import { SunExposure } from "@/domain/models";
import { TtlCache } from "@/lib/ttlCache";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";
const DEFAULT_VL_URL = "https://api.siliconflow.com/v1/chat/completions";
const DEFAULT_VL_MODEL = "Qwen/Qwen3-VL-8B-Instruct";

export const VisionSuggestion = z.object({
  sun: SunExposure,
  observations: z.array(z.string()).max(5).default([]),
  note: z.string().max(280).optional(),
});
export type VisionSuggestion = z.infer<typeof VisionSuggestion>;

const SYSTEM_PROMPT = `You analyze a single homeowner photo of a yard area to help plan a planting bed. You give ESTIMATES, never measurements or guarantees.

Return ONLY a JSON object (no markdown):
{
  "sun": "full-sun" | "part-sun" | "shade" | "unknown",
  "observations": string[],   // up to 4 short, concrete things you can actually see (e.g. "north-facing fence on the left", "mature tree likely shades the afternoon", "existing lawn to remove")
  "note": string              // one short, honest caveat
}

Rules:
- If you cannot tell sun exposure with reasonable confidence, use "unknown".
- Only state what is visible. Do not invent plants, measurements, soil, or zone.
- Keep it brief and practical.`;

// 30-minute dedupe of identical photos (well under any signed-URL expiry).
const visionCache = new TtlCache<VisionSuggestion>(30 * 60 * 1000, 100);

function isClaudeVision(): boolean {
  return (process.env.AI_PROVIDER ?? "mock").toLowerCase() === "claude" && Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isVisionEnabled(): boolean {
  return isClaudeVision() || Boolean(process.env.VISION_API_KEY);
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export async function analyzeYardPhoto(base64: string, mediaType: string): Promise<VisionSuggestion | null> {
  const key = createHash("sha1").update(base64).digest("hex");
  const cached = visionCache.get(key);
  if (cached) return cached;

  let result: VisionSuggestion | null = null;
  if (isClaudeVision()) result = await analyzeWithClaude(base64, mediaType);
  else if (process.env.VISION_API_KEY) result = await analyzeWithVlChat(base64, mediaType);

  if (result) visionCache.set(key, result);
  return result;
}

/** Claude vision (Anthropic Messages API). */
async function analyzeWithClaude(base64: string, mediaType: string): Promise<VisionSuggestion | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.AI_MODEL ?? DEFAULT_CLAUDE_MODEL;
  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
              { type: "text", text: "Analyze this yard photo. Return only the JSON." },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const text = readClaudeText(await res.json());
    if (!text) return null;
    const parsed = VisionSuggestion.safeParse(JSON.parse(extractJson(text)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** OpenAI-compatible vision-language chat (e.g. SiliconFlow Qwen2.5-VL). */
async function analyzeWithVlChat(base64: string, mediaType: string): Promise<VisionSuggestion | null> {
  const key = process.env.VISION_API_KEY;
  if (!key) return null;
  const url = process.env.VISION_API_URL ?? DEFAULT_VL_URL;
  const model = process.env.VISION_MODEL ?? DEFAULT_VL_MODEL;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        stream: false,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this yard photo. Return only the JSON." },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? null;
    if (!text) return null;
    const parsed = VisionSuggestion.safeParse(JSON.parse(extractJson(text)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function readClaudeText(data: unknown): string | null {
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as { content: unknown[] }).content)) {
    const block = (data as { content: Array<{ type?: string; text?: string }> }).content.find(
      (b) => b.type === "text" && typeof b.text === "string",
    );
    return block?.text ?? null;
  }
  return null;
}
