/**
 * Yard-photo vision endpoint (optional, off by default).
 * GET  → { enabled }.
 * POST → { imageBase64, mediaType } → { suggestion } (confirmable estimates), or 503 when disabled.
 * The photo is used transiently for this request only — never stored.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeYardPhoto, isVisionEnabled } from "@/lib/visionProvider";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ enabled: isVisionEnabled() });
}

const Body = z.object({
  imageBase64: z.string().min(100).max(8_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export async function POST(request: Request) {
  if (!isVisionEnabled()) {
    return NextResponse.json({ error: "Photo analysis isn't enabled on this deployment.", enabled: false }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "A base64 image and mediaType are required." }, { status: 400 });
  }

  try {
    const suggestion = await analyzeYardPhoto(parsed.data.imageBase64, parsed.data.mediaType);
    if (!suggestion) {
      return NextResponse.json({ error: "Couldn't read that photo — try a clearer one." }, { status: 502 });
    }
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Bloomprint photo analysis failed", error);
    return NextResponse.json({ error: "Photo analysis is temporarily unavailable." }, { status: 502 });
  }
}
