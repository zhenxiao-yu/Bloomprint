/**
 * Interactive SAM (SlimSAM) segmenter — "tap a spot in the photo → a precise
 * mask for the thing under the tap → one draft zone."
 *
 * HONESTY CONTRACT (same as the rest of vision/): proposals only. The picked
 * zone is confidence "low", source "ai-draft"; the user confirms its type and
 * calibrates real size. No real-world measurements come from the model.
 *
 * Runs fully client-side via @huggingface/transformers (SlimSAM, ~30–50 MB,
 * lazy-loaded from the HF CDN). transformers is imported lazily INSIDE the
 * methods so this module is SSR-safe and stays out of the main bundle. Every
 * method is total — prepare() returns false and pickAt() returns null on any
 * failure (no WebGPU/WASM, blocked CDN, offline), so the app never breaks; the
 * one-shot DeepLab/template auto-detect remains the no-download path.
 *
 * Single-threaded WASM / WebGPU only — we deliberately avoid SharedArrayBuffer
 * so no COOP/COEP headers are needed (those would break Google OAuth popups).
 */
import { maskToPolygons } from "@/lib/yard-map/maskToPolygons";
import type { DraftZone, PointSegmenter, SegmentInput } from "./segmentation";
import type { Point, YardZoneType } from "@/lib/yard-map/zoneModel";

const MODEL_ID = "Xenova/slimsam-77-uniform";

/**
 * Pure core: turn a SAM mask plane (logits or 0/1, foreground = value > 0) of
 * width×height into a single draft zone, or null if nothing meaningful is
 * under the tap. Unit-testable without loading the model (mirrors
 * labelGridToDraftZones in deeplabSegmenter).
 */
export function samMaskToDraftZone(
  mask: ArrayLike<number>,
  width: number,
  height: number,
  opts: { type?: YardZoneType; label?: string; minAreaFraction?: number } = {},
): DraftZone | null {
  if (width <= 0 || height <= 0 || mask.length < width * height) return null;
  const binary = new Uint8Array(width * height);
  let any = false;
  for (let i = 0; i < binary.length; i++) {
    if (mask[i] > 0) {
      binary[i] = 1;
      any = true;
    }
  }
  if (!any) return null;
  const polys = maskToPolygons(binary, width, height, 1, {
    maxPolygons: 1,
    minAreaFraction: opts.minAreaFraction ?? 0.003,
    simplifyTolerance: 0.008,
  });
  const points: Point[] | undefined = polys[0];
  if (!points || points.length < 3) return null;
  return { type: opts.type ?? "planting_bed", points, confidence: "low", label: opts.label ?? "selection" };
}

// Minimal structural types for the bits of @huggingface/transformers we use,
// so the module stays `any`-free (repo lint) without depending on the lib's
// full type surface. We cast the dynamically-imported exports to these.
interface MaskTensor {
  data: Uint8Array;
  dims: number[];
}
interface SamProcessor {
  (image: unknown): Promise<{
    original_sizes: [number, number][];
    reshaped_input_sizes: [number, number][];
  }>;
  reshape_input_points(
    points: number[][][],
    originalSizes: [number, number][],
    reshapedSizes: [number, number][],
  ): unknown;
  add_input_labels(labels: number[][], points: unknown): unknown;
  post_process_masks(
    masks: unknown,
    originalSizes: [number, number][],
    reshapedSizes: [number, number][],
  ): Promise<MaskTensor[]>;
}
interface SamModelLike {
  (inputs: Record<string, unknown>): Promise<{ pred_masks: unknown; iou_scores: { data: ArrayLike<number> } }>;
  get_image_embeddings(inputs: unknown): Promise<{
    image_embeddings: unknown;
    image_positional_embeddings: unknown;
  }>;
}
interface RawImageCtor {
  new (data: Uint8ClampedArray, width: number, height: number, channels: number): { rgb(): unknown };
}
interface TransformersModule {
  AutoProcessor: { from_pretrained(id: string): Promise<unknown> };
  SamModel: { from_pretrained(id: string, opts?: Record<string, unknown>): Promise<unknown> };
  RawImage: RawImageCtor;
}

/**
 * Load transformers.js from the jsDelivr ESM CDN at runtime. We deliberately do
 * NOT import the npm package by bare specifier: that pulls onnxruntime-node's
 * native binaries into the build graph, which Turbopack tries to symlink (and
 * Windows junction creation fails). `turbopackIgnore` keeps the import out of
 * the build entirely; the browser fetches it (and the model weights) from the
 * CDN on first use. The package stays in package.json to pin the version.
 */
const TRANSFORMERS_CDN: string =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/+esm";
let tfModulePromise: Promise<TransformersModule> | null = null;
function loadTransformers(): Promise<TransformersModule> {
  if (!tfModulePromise) {
    tfModulePromise = import(/* turbopackIgnore: true */ TRANSFORMERS_CDN).then(
      (m) => m as TransformersModule,
    );
  }
  return tfModulePromise;
}

// Module-scoped cache: the heavy embedding is computed once per prepared image.
type Cache = {
  processor: SamProcessor;
  model: SamModelLike;
  imageEmbeddings: unknown;
  imagePositionalEmbeddings: unknown;
  originalSizes: [number, number][];
  reshapedInputSizes: [number, number][];
};
let cache: Cache | null = null;
let loadPromise: Promise<{ processor: SamProcessor; model: SamModelLike }> | null = null;

/** Draw any supported image source into an RGB RawImage for the processor. */
function toRawImage(
  RawImage: RawImageCtor,
  image: HTMLImageElement | HTMLCanvasElement | ImageData,
): unknown {
  if (typeof ImageData !== "undefined" && image instanceof ImageData) {
    return new RawImage(image.data, image.width, image.height, 4).rgb();
  }
  const w = "naturalWidth" in image ? image.naturalWidth || image.width : image.width;
  const h = "naturalHeight" in image ? image.naturalHeight || image.height : image.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(image as CanvasImageSource, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  return new RawImage(data.data, w, h, 4).rgb();
}

async function loadModel() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    const tf = await loadTransformers();
    const device =
      typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "wasm";
    const processor = (await tf.AutoProcessor.from_pretrained(MODEL_ID)) as unknown as SamProcessor;
    const model = (await tf.SamModel.from_pretrained(MODEL_ID, { device }).catch(
      // Retry once on the safe WASM backend if the preferred device failed.
      () => tf.SamModel.from_pretrained(MODEL_ID, { device: "wasm" }),
    )) as unknown as SamModelLike;
    return { processor, model };
  })();
  try {
    return await loadPromise;
  } catch (e) {
    loadPromise = null; // allow a later retry
    throw e;
  }
}

export const samSegmenter: PointSegmenter = {
  name: "slimsam",

  async prepare(image): Promise<boolean> {
    try {
      const tf = await loadTransformers();
      const { processor, model } = await loadModel();
      const raw = toRawImage(tf.RawImage, image);
      const inputs = await processor(raw);
      const { image_embeddings, image_positional_embeddings } =
        await model.get_image_embeddings(inputs);
      cache = {
        processor,
        model,
        imageEmbeddings: image_embeddings,
        imagePositionalEmbeddings: image_positional_embeddings,
        originalSizes: inputs.original_sizes,
        reshapedInputSizes: inputs.reshaped_input_sizes,
      };
      return true;
    } catch {
      cache = null;
      return false;
    }
  },

  async pickAt(point: Point): Promise<DraftZone | null> {
    const c = cache;
    if (!c) return null;
    try {
      const [oh, ow] = c.originalSizes[0]; // [height, width]
      const px = point.x * ow;
      const py = point.y * oh;
      const inputPoints = c.processor.reshape_input_points(
        [[[px, py]]],
        c.originalSizes,
        c.reshapedInputSizes,
      );
      const inputLabels = c.processor.add_input_labels([[1]], inputPoints);
      const outputs = await c.model({
        image_embeddings: c.imageEmbeddings,
        image_positional_embeddings: c.imagePositionalEmbeddings,
        input_points: inputPoints,
        input_labels: inputLabels,
      });
      const masks = await c.processor.post_process_masks(
        outputs.pred_masks,
        c.originalSizes,
        c.reshapedInputSizes,
      );
      const maskTensor = masks[0]; // dims [1, numMasks, H, W], bool
      const [, numMasks, H, W] = maskTensor.dims;
      const scores = outputs.iou_scores.data; // length numMasks
      let best = 0;
      for (let i = 1; i < numMasks; i++) if (scores[i] > scores[best]) best = i;
      const plane = maskTensor.data.subarray(best * H * W, (best + 1) * H * W);
      return samMaskToDraftZone(plane, W, H);
    } catch {
      return null;
    }
  },

  reset(): void {
    cache = null;
  },
};

// Re-export the input type so callers can pass intake context if ever needed.
export type { SegmentInput };
