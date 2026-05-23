/**
 * Orchestrates "turn my photo into a draft map": try the on-device ML segmenter
 * first (when the user asked for it and a photo exists), and fall back to the
 * key-free heuristic template whenever ML is off, has no photo, or returns
 * nothing (model blocked, no WebGL, offline). The caller always gets draft
 * zones — the feature can never hard-fail (DECISIONS.md D11).
 */
import type { DraftZone, SegmentInput } from "./segmentation";
import { heuristicSegmenter } from "./heuristicSegmenter";
import { deeplabSegmenter } from "./deeplabSegmenter";

export type DetectMode = "ai" | "template";

export interface DetectResult {
  zones: DraftZone[];
  /** Which segmenter actually produced the zones (for honest UI labeling). */
  source: "deeplab-ade20k" | "heuristic-template";
}

export async function detectDraftZones(
  input: SegmentInput,
  prefer: DetectMode,
): Promise<DetectResult> {
  if (prefer === "ai" && input.image) {
    const zones = await deeplabSegmenter.segment(input);
    if (zones.length > 0) return { zones, source: "deeplab-ade20k" };
  }
  return { zones: await heuristicSegmenter.segment(input), source: "heuristic-template" };
}
