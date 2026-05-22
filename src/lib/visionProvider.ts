/**
 * Optional yard-photo vision (Claude) — OFF unless a real Claude key is configured.
 *
 * It returns *confirmable estimates* (sun exposure + a few honest observations), never measurements
 * and never anything fed silently into the plan. The user reviews and applies suggestions; the
 * deterministic plan stays the source of truth (docs/DECISIONS.md D1/D2). Any failure → null.
 */
import { z } from "zod";
import { SunExposure } from "@/domain/models";

const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

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

export function isVisionEnabled(): boolean {
  return (process.env.AI_PROVIDER ?? "mock").toLowerCase() === "claude" && Boolean(process.env.ANTHROPIC_API_KEY);
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

export async function analyzeYardPhoto(base64: string, mediaType: string): Promise<VisionSuggestion | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.AI_MODEL ?? DEFAULT_MODEL;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
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
    const data: unknown = await res.json();
    const text = readText(data);
    if (!text) return null;
    const parsed = VisionSuggestion.safeParse(JSON.parse(extractJson(text)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function readText(data: unknown): string | null {
  if (data && typeof data === "object" && "content" in data && Array.isArray((data as { content: unknown[] }).content)) {
    const block = (data as { content: Array<{ type?: string; text?: string }> }).content.find(
      (b) => b.type === "text" && typeof b.text === "string",
    );
    return block?.text ?? null;
  }
  return null;
}
