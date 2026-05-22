/**
 * Optional AI image render — provider-agnostic and OFF by default.
 *
 * Anthropic Claude doesn't generate images, so this calls an external, OpenAI-images-compatible
 * endpoint *only* when `IMAGE_API_KEY` is set. With no key the feature is simply disabled (the UI
 * hides the button), preserving the locked principle: the app works fully with no keys
 * (docs/DECISIONS.md). The image is decorative — it never feeds the deterministic plan, and the UI
 * labels it clearly as an imagined illustration, not a photo.
 */
const DEFAULT_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_MODEL = "gpt-image-1";

export function isImageRenderEnabled(): boolean {
  return Boolean(process.env.IMAGE_API_KEY);
}

interface ImagesResponse {
  data?: Array<{ b64_json?: string; url?: string }>;
}

/** Render an illustration for `prompt`. Returns a data URL or absolute URL, or null on any failure. */
export async function renderImage(prompt: string): Promise<string | null> {
  const key = process.env.IMAGE_API_KEY;
  if (!key) return null;

  const url = process.env.IMAGE_API_URL ?? DEFAULT_URL;
  const model = process.env.IMAGE_MODEL ?? DEFAULT_MODEL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, prompt: prompt.slice(0, 1000), n: 1, size: "1024x1024" }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ImagesResponse;
    const first = data.data?.[0];
    if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
    if (first?.url) return first.url;
    return null;
  } catch {
    return null;
  }
}
