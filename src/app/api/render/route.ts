/**
 * Image render endpoint (optional, off by default).
 * GET  → { enabled } so the client can decide whether to show the button.
 * POST → { prompt } → { image } (data/URL), or 503 when disabled. Decorative only; never plan data.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isControlNetRenderEnabled, isImageRenderEnabled, renderImage } from "@/lib/imageProvider";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  return NextResponse.json({
    enabled: isImageRenderEnabled(),
    controlnet: isControlNetRenderEnabled(),
  });
}

const Body = z.object({
  prompt: z.string().min(10).max(1000),
  // Optional yard photo (base64, no data: prefix) for a ControlNet concept restyle.
  photoBase64: z.string().max(8_000_000).optional(),
});

export async function POST(request: Request) {
  if (!isImageRenderEnabled()) {
    return NextResponse.json({ error: "Image rendering isn't enabled on this deployment.", enabled: false }, { status: 503 });
  }

  const rl = rateLimit(`${clientIp(request)}:render`, 6, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many image requests — please wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "A prompt (10–1000 chars) is required." }, { status: 400 });
  }

  try {
    const image = await renderImage(parsed.data.prompt, { photoBase64: parsed.data.photoBase64 });
    if (!image) {
      return NextResponse.json({ error: "Couldn't generate an image right now." }, { status: 502 });
    }
    return NextResponse.json({ image });
  } catch (error) {
    console.error("Bloomprint image render failed", error);
    return NextResponse.json({ error: "Image rendering is temporarily unavailable." }, { status: 502 });
  }
}
