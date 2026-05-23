/**
 * Optional AI image render — provider-agnostic and OFF by default.
 *
 * Two wire formats are supported (set IMAGE_FORMAT):
 *  - "openai" (default): OpenAI-images-compatible — body { model, prompt, n, size },
 *    response { data: [{ b64_json | url }] }. Works with OpenAI, Recraft, etc.
 *  - "siliconflow": SiliconFlow's image API — body { model, prompt, image_size },
 *    response { images: [{ url }] }. Cheapest path (e.g. FLUX.1-schnell, ~$0.0014/img).
 *
 * With no IMAGE_API_KEY the feature is simply disabled (the UI hides the button),
 * preserving the locked principle that the app works fully with no keys (docs/DECISIONS.md).
 * The image is decorative — it never feeds the deterministic plan, and the UI labels it clearly
 * as an imagined illustration, not a photo.
 *
 * Concept restyle (ControlNet, "openai" format only): when IMAGE_CONTROLNET is set AND the caller
 * passes the user's photo, the request becomes a structure-preserving img2img call (the configured
 * endpoint must be ControlNet-depth capable). Still decorative, still never feeds the plan.
 */
import { TtlCache } from "@/lib/ttlCache";

const DEFAULT_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-image-1";

// Dedupe identical text-to-image renders for 40 min (under SiliconFlow's ~1h
// URL expiry) so repeated clicks of the same prompt don't re-bill. Photo
// restyles (which carry a unique image) are never cached.
const renderCache = new TtlCache<string>(40 * 60 * 1000, 50);

export type ImageFormat = "openai" | "siliconflow";

export function imageFormat(): ImageFormat {
  return process.env.IMAGE_FORMAT === "siliconflow" ? "siliconflow" : "openai";
}

export function isImageRenderEnabled(): boolean {
  return Boolean(process.env.IMAGE_API_KEY);
}

/** True only when image render is on, in openai format, AND a ControlNet endpoint is configured. */
export function isControlNetRenderEnabled(): boolean {
  return isImageRenderEnabled() && imageFormat() === "openai" && Boolean(process.env.IMAGE_CONTROLNET);
}

interface OpenAIImagesResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
}
interface SiliconFlowImagesResponse {
  images?: Array<{ url?: string }>;
}

export interface RenderOptions {
  /** Base64 (no data: prefix) of the user's yard photo, for a ControlNet restyle (openai only). */
  photoBase64?: string;
}

/**
 * Build the request body. Pure + deterministic (no env reads) so it can be unit-tested.
 * Branches on wire format; the ControlNet img2img variant applies to the openai format only.
 */
export function buildRenderBody(
  model: string,
  prompt: string,
  opts: { photoBase64?: string; controlnet?: boolean; format?: ImageFormat; size?: string } = {},
): Record<string, unknown> {
  const size = opts.size ?? "1024x1024";
  const safePrompt = prompt.slice(0, 1000);
  if (opts.format === "siliconflow") {
    return { model, prompt: safePrompt, image_size: size };
  }
  const base = { model, prompt: safePrompt, n: 1, size };
  if (opts.photoBase64 && opts.controlnet) {
    return { ...base, image: opts.photoBase64, controlnet: "depth", strength: 0.7 };
  }
  return base;
}

/** Pure response parser → a data/URL string, or null. Branches on wire format. */
export function parseRenderResponse(data: unknown, format: ImageFormat): string | null {
  if (format === "siliconflow") {
    const d = data as SiliconFlowImagesResponse;
    return d.images?.[0]?.url ?? null;
  }
  const d = data as OpenAIImagesResponse;
  const first = d.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  return first?.url ?? null;
}

/** Render an illustration for `prompt`. Returns a data URL or absolute URL, or null on any failure. */
export async function renderImage(prompt: string, opts: RenderOptions = {}): Promise<string | null> {
  const key = process.env.IMAGE_API_KEY;
  if (!key) return null;

  const url = process.env.IMAGE_API_URL ?? DEFAULT_URL;
  const model = process.env.IMAGE_MODEL ?? DEFAULT_MODEL;
  const format = imageFormat();
  const controlnet = Boolean(opts.photoBase64 && process.env.IMAGE_CONTROLNET) && format === "openai";

  // Cache only plain text-to-image (a photo restyle is unique per photo).
  const cacheKey = !opts.photoBase64 ? `${format}|${model}|${prompt.slice(0, 1000)}` : null;
  if (cacheKey) {
    const hit = renderCache.get(cacheKey);
    if (hit) return hit;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify(buildRenderBody(model, prompt, { photoBase64: opts.photoBase64, controlnet, format })),
    });
    if (!res.ok) return null;
    const image = parseRenderResponse(await res.json(), format);
    if (image && cacheKey) renderCache.set(cacheKey, image);
    return image;
  } catch {
    return null;
  }
}
