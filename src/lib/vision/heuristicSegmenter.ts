/**
 * Heuristic yard segmenter — the key-free fallback that guarantees "turn my
 * photo into a draft map" works with no model, no network, and no WebGL.
 *
 * It does NOT look at the photo. It lays down a sensible starting template for
 * a typical suburban yard (camera facing the yard: house/structures toward the
 * top, lawn in the middle, beds along the edges) and biases that template by
 * the intake goal. Every zone is confidence "low" — a starting point the user
 * drags into place, not a claim about their actual yard.
 *
 * Pure (no DOM); unit-testable.
 */
import { rectToPolygon, type NormalizedRect } from "@/lib/yard-map/rectGeometry";
import type { DraftZone, SegmentInput, YardSegmenter } from "./segmentation";
import type { YardZoneType } from "@/lib/yard-map/zoneModel";

function zone(type: YardZoneType, rect: NormalizedRect, label: string): DraftZone {
  return { type, points: rectToPolygon(rect), confidence: "low", label };
}

/**
 * A starting template, biased by goal. Returns draft zones in normalized
 * (0..1) coordinates with y=0 at the top of the frame.
 */
export function heuristicDraftZones(goal?: string): DraftZone[] {
  // Foundation bed along the house line + a central lawn are common to all.
  const base: DraftZone[] = [
    zone("planting_bed", { x: 0.08, y: 0.18, width: 0.84, height: 0.13 }, "foundation bed"),
    zone("lawn", { x: 0.12, y: 0.46, width: 0.76, height: 0.4 }, "lawn"),
    zone("walkway", { x: 0.45, y: 0.62, width: 0.1, height: 0.36 }, "path"),
  ];

  switch (goal) {
    case "privacy":
      return [
        zone("fence", { x: 0.06, y: 0.12, width: 0.88, height: 0.05 }, "back fence line"),
        zone("privacy_target", { x: 0.06, y: 0.17, width: 0.88, height: 0.13 }, "screening bed"),
        zone("lawn", { x: 0.12, y: 0.48, width: 0.76, height: 0.34 }, "lawn"),
      ];
    case "curb-appeal":
      return [
        zone("planting_bed", { x: 0.06, y: 0.2, width: 0.34, height: 0.22 }, "left bed"),
        zone("planting_bed", { x: 0.6, y: 0.2, width: 0.34, height: 0.22 }, "right bed"),
        zone("walkway", { x: 0.44, y: 0.42, width: 0.12, height: 0.56 }, "front walk"),
        zone("lawn", { x: 0.06, y: 0.62, width: 0.34, height: 0.32 }, "lawn left"),
        zone("lawn", { x: 0.6, y: 0.62, width: 0.34, height: 0.32 }, "lawn right"),
      ];
    case "pollinator":
      return [
        zone("planting_bed", { x: 0.1, y: 0.2, width: 0.8, height: 0.32 }, "pollinator bed"),
        zone("lawn", { x: 0.14, y: 0.58, width: 0.72, height: 0.3 }, "lawn"),
      ];
    case "low-maintenance":
      return [
        zone("planting_bed", { x: 0.08, y: 0.2, width: 0.84, height: 0.1 }, "low-care border"),
        zone("lawn", { x: 0.1, y: 0.4, width: 0.8, height: 0.5 }, "lawn"),
      ];
    case "shade-tolerant":
      return [
        zone("planting_bed", { x: 0.08, y: 0.3, width: 0.5, height: 0.32 }, "shade bed"),
        zone("lawn", { x: 0.6, y: 0.46, width: 0.32, height: 0.4 }, "sunnier lawn"),
        zone("walkway", { x: 0.45, y: 0.66, width: 0.1, height: 0.32 }, "path"),
      ];
    default:
      return base;
  }
}

/** The key-free segmenter. Ignores the image; always succeeds. */
export const heuristicSegmenter: YardSegmenter = {
  name: "heuristic-template",
  async segment(input: SegmentInput): Promise<DraftZone[]> {
    return heuristicDraftZones(input.goal);
  },
};
