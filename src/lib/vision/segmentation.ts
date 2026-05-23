/**
 * On-device yard segmentation — the pluggable contract behind "turn my photo
 * into a draft map".
 *
 * HONESTY CONTRACT (CLAUDE.md, DECISIONS.md D1/D2/D7):
 *  - A segmenter proposes DRAFT zones only. They are confidence "low",
 *    source "ai-draft", and the UI must label them as proposals to confirm.
 *  - Segmenters work in pixel/normalized space. They NEVER produce real-world
 *    measurements — dimensions always come from the user's calibration.
 *  - segment() must be total: it returns [] rather than throwing, so a failed
 *    model load (offline, no WebGL, blocked CDN) silently degrades to the
 *    heuristic fallback. The app is never blocked by the ML path.
 *
 * Implementations: `deeplabSegmenter` (real, lazy TF.js) and
 * `heuristicSegmenter` (key-free template draft). Both satisfy YardSegmenter.
 */
import type { Point, YardZoneType } from "@/lib/yard-map/zoneModel";

/** A proposed zone in normalized (0..1) image coordinates. */
export interface DraftZone {
  type: YardZoneType;
  points: Point[];
  confidence: "low" | "medium";
  /** Human-readable source class, e.g. "grass" — shown as the draft's label. */
  label?: string;
}

export interface SegmentInput {
  /** The photo to analyze. Heuristic segmenters may ignore this. */
  image?: HTMLImageElement | HTMLCanvasElement | ImageData;
  /** Intake goal, used by the heuristic to bias a sensible starting layout. */
  goal?: string;
}

export interface YardSegmenter {
  readonly name: string;
  /** Propose draft zones. MUST resolve to [] (never reject) on any failure. */
  segment(input: SegmentInput): Promise<DraftZone[]>;
}

/**
 * Map an ADE20K class label to a yard zone type, or null to ignore (sky,
 * people, vehicles, indoor classes). ADE20K labels are comma-joined synonym
 * lists (e.g. "grass", "tree", "path, way"), so we match by keyword substring
 * to stay robust to exact spelling across model versions.
 *
 * Pure + deterministic so it can be unit-tested without loading a model.
 */
const ADE20K_KEYWORD_MAP: { keywords: string[]; type: YardZoneType }[] = [
  // Order matters: earlier rows win when a label matches several keywords.
  { keywords: ["grass", "field"], type: "lawn" },
  { keywords: ["fence", "railing", "hedge", "balustrade"], type: "fence" },
  { keywords: ["sidewalk", "pavement", "path", "stairs", "stairway", "step"], type: "walkway" },
  { keywords: ["road", "route", "runway", "driveway"], type: "driveway" },
  { keywords: ["tree", "plant", "flower", "palm", "bush", "shrub"], type: "planting_bed" },
  { keywords: ["building", "house", "wall", "hovel", "skyscraper", "garage"], type: "keep" },
  { keywords: ["water", "pool", "lake", "pond", "fountain"], type: "keep" },
  { keywords: ["rock", "stone", "boulder"], type: "keep" },
  { keywords: ["earth", "ground", "soil", "dirt", "sand", "land", "mud"], type: "problem_area" },
];

export function ade20kLabelToZoneType(label: string): YardZoneType | null {
  const l = label.toLowerCase();
  for (const row of ADE20K_KEYWORD_MAP) {
    if (row.keywords.some((kw) => l.includes(kw))) return row.type;
  }
  return null;
}
