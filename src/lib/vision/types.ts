/**
 * Provider-agnostic yard vision interface.
 *
 * Generalizes the existing Claude-specific provider (src/lib/visionProvider.ts).
 * Any vision backend — Qwen-VL, Gemini, GLM, OpenAI, or the existing Claude
 * provider — can implement `YardVisionProvider` and return a Zod-validated
 * `YardVisionResult`. Results are confirmable ESTIMATES surfaced to the user;
 * they are never silently fed into the deterministic plan, and the provider
 * may not invent facts (CLAUDE.md, docs/DECISIONS.md). Any failure → null.
 */
import { z } from "zod";
import { SunExposure } from "@/domain/models";

/** Structured, honest read of a single yard photo. */
export const YardVisionResult = z.object({
  /** Concrete things actually visible in the photo. */
  visibleElements: z.array(z.string()).default([]),
  /** Things working in the yard's favor. */
  positives: z.array(z.string()).default([]),
  /** Problems or constraints seen. */
  negatives: z.array(z.string()).default([]),
  /** Opportunities the photo suggests. */
  opportunities: z.array(z.string()).default([]),
  /** Things the model is unsure about — honest hedging. */
  uncertainties: z.array(z.string()).default([]),
  /** Estimated sun exposure, if confident enough. */
  sun: SunExposure.optional(),
  /** One short, plain-language caveat. */
  note: z.string().optional(),
});
export type YardVisionResult = z.infer<typeof YardVisionResult>;

/** Input image for analysis, as base64 plus its media type. */
export interface YardVisionInput {
  base64: string;
  mediaType: string;
}

/**
 * A pluggable vision provider. Implementations must be safe to call without a
 * key (returning null when unavailable) so the app never blocks on vision.
 */
export interface YardVisionProvider {
  /** Stable identifier, e.g. "mock", "claude", "qwen-vl". */
  name: string;
  /** Analyze an image; resolve to a validated result or null on any failure. */
  analyze(input: YardVisionInput): Promise<YardVisionResult | null>;
}
