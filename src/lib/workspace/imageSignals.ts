/**
 * Pure, framework-free image heuristics computed from a small RGBA sample of a
 * photo. No canvas/DOM here — the caller samples the image to a tiny grid and
 * passes the pixel buffer, so this is unit-testable in Node and reusable for
 * both uploaded-photo inspection and live-camera frames.
 *
 * These are deliberately coarse signals, never measurements: they drive honest
 * "retake this" guidance and a rough greenery/hardscape read, nothing the plan
 * depends on.
 */
import type { PhotoQuality } from "@/lib/workspace/types";

export interface ImageSignals {
  /** Mean luma, 0..255. */
  brightness: number;
  /** Standard deviation of luma — a flat frame (lens covered) trends to 0. */
  contrast: number;
  /** Variance of the Laplacian response — higher is sharper, low means blurry. */
  sharpness: number;
  /** Fraction of vegetation-like (green-dominant) pixels, 0..1. */
  greenRatio: number;
  /** Fraction of neutral/gray hard-surface pixels (paving, walls), 0..1. */
  hardscapeRatio: number;
  /** Fraction of near-black pixels, 0..1. */
  darkRatio: number;
  /** Fraction of near-white/blown-out pixels, 0..1. */
  brightRatio: number;
}

/** Neutral signals that grade as "good" — used when sampling is unavailable. */
export const NEUTRAL_SIGNALS: ImageSignals = {
  brightness: 128,
  contrast: 48,
  sharpness: 999,
  greenRatio: 0,
  hardscapeRatio: 0,
  darkRatio: 0,
  brightRatio: 0,
};

/** Below this Laplacian variance (on a ~160px sample) a photo reads as blurry. */
export const BLUR_THRESHOLD = 18;

export function computeImageSignals(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
): ImageSignals {
  const n = width * height;
  if (!data || data.length < 4 || width <= 0 || height <= 0 || data.length < n * 4) {
    return { ...NEUTRAL_SIGNALS };
  }

  const luma = new Float64Array(n);
  let sum = 0;
  let green = 0;
  let hard = 0;
  let dark = 0;
  let bright = 0;
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[p] = y;
    sum += y;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (g > r + 8 && g > b + 8 && y > 30 && y < 235) green++;
    else if (max - min < 22 && y > 50 && y < 215) hard++;
    if (y < 30) dark++;
    if (y > 235) bright++;
  }
  const brightness = sum / n;

  let varSum = 0;
  for (let p = 0; p < n; p++) {
    const d = luma[p] - brightness;
    varSum += d * d;
  }
  const contrast = Math.sqrt(varSum / n);

  // 4-neighbour Laplacian variance over interior pixels — a standard blur metric.
  let lapSum = 0;
  let lapSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const lap = 4 * luma[idx] - luma[idx - 1] - luma[idx + 1] - luma[idx - width] - luma[idx + width];
      lapSum += lap;
      lapSq += lap * lap;
      count++;
    }
  }
  const sharpness = count > 0 ? lapSq / count - (lapSum / count) ** 2 : NEUTRAL_SIGNALS.sharpness;

  return {
    brightness,
    contrast,
    sharpness,
    greenRatio: green / n,
    hardscapeRatio: hard / n,
    darkRatio: dark / n,
    brightRatio: bright / n,
  };
}

export interface QualityGrade {
  quality: PhotoQuality;
  warnings: string[];
}

/**
 * Turn signals + the photo's shortest side into a quality verdict and honest,
 * actionable retake messages. Hard rejects (unusable): too small, lens covered,
 * pitch dark. Soft (needs_review): small, dim, blown out, low detail, blurry.
 */
export function gradeImageQuality(signals: ImageSignals, shortestSide: number): QualityGrade {
  const warnings: string[] = [];
  let quality: PhotoQuality = "good";
  const downgrade = (next: PhotoQuality) => {
    if (next === "unusable") quality = "unusable";
    else if (next === "needs_review" && quality !== "unusable") quality = "needs_review";
  };

  if (shortestSide > 0 && shortestSide < 320) {
    downgrade("unusable");
    warnings.push(
      "Image is too small for reliable planning. Retake from farther back or upload a larger photo.",
    );
  } else if (shortestSide > 0 && shortestSide < 640) {
    downgrade("needs_review");
    warnings.push("Image is small. It can help, but measurements and plant details may be unreliable.");
  }

  const occluded = signals.darkRatio > 0.9 && signals.contrast < 6;
  if (occluded) {
    downgrade("unusable");
    warnings.push("Something may be covering the lens. Clear the camera and retake.");
  } else if (signals.brightness < 18 && signals.darkRatio > 0.8) {
    downgrade("unusable");
    warnings.push("Too dark to plan from. Retake in daylight.");
  } else if (signals.brightness < 38) {
    downgrade("needs_review");
    warnings.push("Photo looks very dark. Retake in daylight if possible.");
  }

  if (signals.brightness > 238 || signals.brightRatio > 0.6) {
    downgrade("needs_review");
    warnings.push("Photo looks overexposed. Retake with less glare if possible.");
  }
  if (!occluded && signals.contrast < 9) {
    downgrade("needs_review");
    warnings.push("Photo has low detail. A clearer wide shot will improve zone detection.");
  }
  if (
    signals.sharpness < BLUR_THRESHOLD &&
    signals.contrast >= 9 &&
    signals.brightness >= 38 &&
    signals.brightness <= 238
  ) {
    downgrade("needs_review");
    warnings.push("Photo looks blurry. Hold steady and retake for sharper detail.");
  }

  return { quality, warnings };
}

/**
 * 64-bit average-hash (aHash) as 16 hex chars. Block-averages the sample to 8x8
 * luma and thresholds against the mean — robust enough to catch the same scene
 * re-uploaded at a different size or filename.
 */
export function perceptualHash(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
): string {
  const S = 8;
  const n = width * height;
  if (!data || width <= 0 || height <= 0 || data.length < n * 4) return "";
  const cells = new Float64Array(S * S);
  const counts = new Int32Array(S * S);
  for (let y = 0; y < height; y++) {
    const cy = Math.min(S - 1, Math.floor((y * S) / height));
    for (let x = 0; x < width; x++) {
      const cx = Math.min(S - 1, Math.floor((x * S) / width));
      const i = (y * width + x) * 4;
      const yv = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const c = cy * S + cx;
      cells[c] += yv;
      counts[c]++;
    }
  }
  let mean = 0;
  for (let c = 0; c < S * S; c++) {
    cells[c] = counts[c] ? cells[c] / counts[c] : 0;
    mean += cells[c];
  }
  mean /= S * S;
  let hex = "";
  for (let c = 0; c < S * S; c += 4) {
    let nibble = 0;
    for (let k = 0; k < 4; k++) nibble = (nibble << 1) | (cells[c + k] >= mean ? 1 : 0);
    hex += nibble.toString(16);
  }
  return hex;
}

/** Bitwise Hamming distance between two hex aHashes (0 = identical, 64 = opposite). */
export function hammingDistance(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Two photos are near-duplicates when their hashes differ by <= threshold bits. */
export function areNearDuplicates(a: string, b: string, threshold = 6): boolean {
  return hammingDistance(a, b) <= threshold;
}

export type RegionClass = "greenery" | "hardscape" | "sky" | "shadow" | "mixed";

export interface RegionCell {
  col: number;
  row: number;
  cls: RegionClass;
}

export interface RegionSummary {
  cols: number;
  rows: number;
  cells: RegionCell[];
  greenRatio: number;
  hardscapeRatio: number;
  skyRatio: number;
  shadowRatio: number;
}

type PixelClass = "green" | "hard" | "sky" | "dark" | "other";

/** Classify a single pixel into a coarse outdoor-scene bucket. */
function classifyPixel(r: number, g: number, b: number): PixelClass {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  if (y < 45) return "dark";
  if (y > 235 || (y > 150 && b >= r - 5 && b >= g - 5)) return "sky";
  if (g > r + 10 && g > b + 10 && y < 235) return "green";
  if (Math.max(r, g, b) - Math.min(r, g, b) < 24 && y >= 50 && y <= 220) return "hard";
  return "other";
}

/**
 * A genuine (pixel-grounded, not templated) coarse read of the photo: split the
 * frame into a cols×rows grid and classify each cell by its dominant content,
 * plus overall greenery/hardscape/sky/shadow ratios. Honest enough to drive an
 * "I can see…" overlay and a greenery-vs-hardscape bar — never a measurement.
 */
export function analyzeRegions(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  cols = 4,
  rows = 4,
): RegionSummary {
  const empty: RegionSummary = {
    cols,
    rows,
    cells: [],
    greenRatio: 0,
    hardscapeRatio: 0,
    skyRatio: 0,
    shadowRatio: 0,
  };
  const n = width * height;
  if (!data || width <= 0 || height <= 0 || data.length < n * 4) return empty;

  const cellCount = cols * rows;
  // Per-cell tallies of each pixel class.
  const tally = Array.from({ length: cellCount }, () => ({
    green: 0,
    hard: 0,
    sky: 0,
    dark: 0,
    total: 0,
  }));
  let green = 0;
  let hard = 0;
  let sky = 0;
  let dark = 0;
  for (let y = 0; y < height; y++) {
    const row = Math.min(rows - 1, Math.floor((y * rows) / height));
    for (let x = 0; x < width; x++) {
      const col = Math.min(cols - 1, Math.floor((x * cols) / width));
      const i = (y * width + x) * 4;
      const cls = classifyPixel(data[i], data[i + 1], data[i + 2]);
      const cell = tally[row * cols + col];
      cell.total++;
      if (cls === "green") {
        cell.green++;
        green++;
      } else if (cls === "hard") {
        cell.hard++;
        hard++;
      } else if (cls === "sky") {
        cell.sky++;
        sky++;
      } else if (cls === "dark") {
        cell.dark++;
        dark++;
      }
    }
  }

  const cells: RegionCell[] = tally.map((cell, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const entries: [RegionClass, number][] = [
      ["greenery", cell.green],
      ["hardscape", cell.hard],
      ["sky", cell.sky],
      ["shadow", cell.dark],
    ];
    let best: RegionClass = "mixed";
    let bestCount = 0;
    for (const [cls, count] of entries) {
      if (count > bestCount) {
        bestCount = count;
        best = cls;
      }
    }
    // Require a real plurality, else the cell is genuinely mixed.
    const cls = cell.total > 0 && bestCount / cell.total >= 0.35 ? best : "mixed";
    return { col, row, cls };
  });

  return {
    cols,
    rows,
    cells,
    greenRatio: green / n,
    hardscapeRatio: hard / n,
    skyRatio: sky / n,
    shadowRatio: dark / n,
  };
}
