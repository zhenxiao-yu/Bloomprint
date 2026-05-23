/**
 * On-device DeepLab segmenter — the real ML path behind "turn my photo into a
 * draft map", satisfying the YardSegmenter contract (see ./segmentation.ts).
 *
 * It runs a quantized DeepLab v3 (ADE20K) model in the browser via TF.js to get
 * a per-pixel class map, then traces each yard-relevant class into normalized
 * polygons (see ../yard-map/maskToPolygons).
 *
 * HONESTY CONTRACT (CLAUDE.md, DECISIONS.md D1/D2/D7):
 *  - Output is DRAFT zones only — every zone is confidence "low", a proposal
 *    the user confirms, never a measurement. The segmenter works in normalized
 *    pixel space; real-world dimensions come solely from user calibration.
 *  - segment() is total: it returns [] rather than throwing on ANY failure
 *    (SSR, no WebGL, blocked CDN, model-load reject), so the app silently falls
 *    back to the heuristic segmenter and is never blocked by the ML path.
 *
 * SSR/bundle safety: TF.js and the model are imported LAZILY inside segment(),
 * never at module top-level, so this file is safe to import anywhere (server or
 * client) and tfjs stays out of the SSR/main bundle. The pure
 * `labelGridToDraftZones` below has no DOM/tf dependency and is unit-tested
 * directly.
 */
import { maskToPolygons } from "@/lib/yard-map/maskToPolygons";
import { polygonAreaNormalized } from "@/lib/yard-map/zoneModel";
import { ade20kLabelToZoneType } from "./segmentation";
import type { DraftZone, SegmentInput, YardSegmenter } from "./segmentation";
// Type-only import: erased at compile time, so it adds NOTHING to the runtime
// bundle and keeps this module SSR-safe (no eager tfjs/deeplab require).
import type { SemanticSegmentation } from "@tensorflow-models/deeplab";

const DEFAULT_MAX_ZONES = 8;
const DEFAULT_MIN_AREA_FRACTION = 0.02;
/** At most this many polygons per class — yards rarely need more, and it caps cost. */
const MAX_POLYGONS_PER_CLASS = 2;

export interface LabelGridToDraftZonesOptions {
  /** Cap on total returned zones, largest-area first. Default 8. */
  maxZones?: number;
  /** Drop class regions smaller than this fraction of the frame. Default 0.02. */
  minAreaFraction?: number;
}

/**
 * Convert a semantic-segmentation label grid into DRAFT yard zones — the pure,
 * testable core of the DeepLab segmenter (no DOM/tf dependency).
 *
 * `grid` is row-major (grid[y][x] = class index), `labels` maps a class index
 * to its ADE20K name (e.g. getLabels("ade20k")). For each distinct class
 * present whose label maps to a yard zone type (sky/person/car/indoor map to
 * null and are skipped), the matching cells are traced into normalized polygons
 * and emitted as confidence-"low" drafts. Zones are sorted by polygon area
 * (largest first) and capped to `maxZones`.
 *
 * Returns [] for an empty or ragged grid, or when nothing maps to a zone.
 */
export function labelGridToDraftZones(
  grid: number[][],
  labels: string[],
  opts: LabelGridToDraftZonesOptions = {},
): DraftZone[] {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (height === 0 || width === 0) return [];

  const maxZones = opts.maxZones ?? DEFAULT_MAX_ZONES;
  const minAreaFraction = opts.minAreaFraction ?? DEFAULT_MIN_AREA_FRACTION;

  // Flatten to a row-major buffer, bailing out if any row is ragged (a short
  // row would misalign flat[y*width+x] and corrupt every class mask).
  const flat = new Int32Array(width * height);
  const present = new Set<number>();
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    if (!row || row.length !== width) return [];
    for (let x = 0; x < width; x++) {
      const cls = row[x];
      flat[y * width + x] = cls;
      present.add(cls);
    }
  }

  const drafts: DraftZone[] = [];
  for (const index of present) {
    const label = labels[index];
    if (label === undefined) continue;
    const type = ade20kLabelToZoneType(label);
    if (type === null) continue; // sky, person, car, indoor, …

    const polygons = maskToPolygons(flat, width, height, index, {
      minAreaFraction,
      maxPolygons: MAX_POLYGONS_PER_CLASS,
    });
    for (const points of polygons) {
      drafts.push({ type, points, confidence: "low", label });
    }
  }

  // Largest regions first — the most salient zones survive the maxZones cap.
  drafts.sort((a, b) => polygonAreaNormalized(b.points) - polygonAreaNormalized(a.points));
  return drafts.slice(0, maxZones);
}

/**
 * Module-scoped, lazily-created model promise so repeated segment() calls reuse
 * one loaded model. Reset to null if a load rejects, so a later call can retry.
 */
let modelPromise: Promise<SemanticSegmentation> | null = null;

/**
 * The real on-device segmenter. Lazily loads TF.js + DeepLab inside segment()
 * and degrades to [] on any failure (it MUST resolve, never reject).
 */
export const deeplabSegmenter: YardSegmenter = {
  name: "deeplab-ade20k",
  async segment(input: SegmentInput): Promise<DraftZone[]> {
    if (!input.image) return [];
    try {
      // Lazy, dynamic imports keep tfjs out of SSR and the main bundle.
      const tf = await import("@tensorflow/tfjs");
      const deeplab = await import("@tensorflow-models/deeplab");

      await tf.ready(); // best-effort backend (WebGL/CPU) init

      if (!modelPromise) {
        modelPromise = deeplab
          .load({ base: "ade20k", quantizationBytes: 2 })
          .catch((err) => {
            // Allow a later retry to re-attempt a failed (e.g. offline) load.
            modelPromise = null;
            throw err;
          });
      }
      const model = await modelPromise;

      const t = model.predict(input.image);
      const grid = (await t.array()) as number[][];
      t.dispose();

      const labels = deeplab.getLabels("ade20k");
      return labelGridToDraftZones(grid, labels);
    } catch {
      // Honesty contract: a failed ML path silently yields the heuristic
      // fallback. Never throw — the app must not be blocked by segmentation.
      return [];
    }
  },
};
