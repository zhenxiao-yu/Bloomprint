/**
 * Image render endpoint (optional, off by default).
 * GET  → { enabled } so the client can decide whether to show the button.
 * POST → { prompt } → { image } (data/URL), or 503 when disabled. Decorative only; never plan data.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { isImageRenderEnabled, renderImage } from "@/lib/imageProvider";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ enabled: isImageRenderEnabled() });
}

const Body = z.object({ prompt: z.string().min(10).max(1000) });

export async function POST(request: Request) {
  if (!isImageRenderEnabled()) {
    return NextResponse.json({ error: "Image rendering isn't enabled on this deployment.", enabled: false }, { status: 503 });
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

  const image = await renderImage(parsed.data.prompt);
  if (!image) {
    return NextResponse.json({ error: "Couldn't generate an image right now." }, { status: 502 });
  }
  return NextResponse.json({ image });
}
