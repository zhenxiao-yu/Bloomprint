"use client";

/**
 * On-device scene read for an attached photo — the same pixel analysis the photo intake uses,
 * factored out so the AI copilot can derive honest "I can see…" observations without any network
 * call or model. Returns coarse coverage ratios; the caller turns those into localized chips.
 */
import { analyzeRegions, type RegionSummary } from "./imageSignals";

const COLS = 6;
const ROWS = 4;

/** Decode an image data URL and compute a pixel-grounded region summary (or null on failure). */
export async function readImageRegions(dataUrl: string): Promise<RegionSummary | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode failed"));
      image.src = dataUrl;
    });
    const cw = 96;
    const ch = 64;
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    const { data } = ctx.getImageData(0, 0, cw, ch);
    return analyzeRegions(data, cw, ch, COLS, ROWS);
  } catch {
    return null;
  }
}

/** Read a File into a data URL (capped to images). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
