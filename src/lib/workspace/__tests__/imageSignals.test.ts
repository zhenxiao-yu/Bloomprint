import { describe, expect, it } from "vitest";
import {
  analyzeRegions,
  areNearDuplicates,
  computeImageSignals,
  gradeImageQuality,
  hammingDistance,
  perceptualHash,
} from "@/lib/workspace/imageSignals";

/** Build an RGBA buffer from a per-pixel colour function. */
function buffer(
  width: number,
  height: number,
  fn: (x: number, y: number) => [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = fn(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

const W = 64;
const H = 64;
const checker = buffer(W, H, (x, y) => {
  const v = (x + y) % 2 === 0 ? 235 : 20;
  return [v, v, v];
});
const gradient = buffer(W, H, (x) => {
  const v = 60 + Math.round((x / W) * 140); // smooth 60..200, near-zero Laplacian
  return [v, v, v];
});
const black = buffer(W, H, () => [0, 0, 0]);

describe("computeImageSignals", () => {
  it("rates a high-frequency image far sharper than a smooth gradient", () => {
    expect(computeImageSignals(checker, W, H).sharpness).toBeGreaterThan(
      computeImageSignals(gradient, W, H).sharpness,
    );
  });

  it("detects vegetation vs hardscape vs darkness", () => {
    const green = buffer(W, H, () => [40, 160, 40]);
    const gray = buffer(W, H, () => [130, 132, 131]);
    expect(computeImageSignals(green, W, H).greenRatio).toBeGreaterThan(0.8);
    expect(computeImageSignals(gray, W, H).hardscapeRatio).toBeGreaterThan(0.8);
    expect(computeImageSignals(black, W, H).darkRatio).toBeGreaterThan(0.95);
  });

  it("returns neutral signals for an invalid buffer", () => {
    expect(computeImageSignals(new Uint8ClampedArray(0), 0, 0).sharpness).toBeGreaterThan(100);
  });
});

describe("gradeImageQuality", () => {
  it("hard-rejects a too-small image", () => {
    const grade = gradeImageQuality(computeImageSignals(checker, W, H), 200);
    expect(grade.quality).toBe("unusable");
    expect(grade.warnings.join(" ")).toMatch(/too small/i);
  });

  it("hard-rejects a covered lens (flat + dark)", () => {
    const grade = gradeImageQuality(computeImageSignals(black, W, H), 1000);
    expect(grade.quality).toBe("unusable");
    expect(grade.warnings.join(" ")).toMatch(/covering the lens/i);
  });

  it("flags a blurry-but-bright image as needs_review", () => {
    const grade = gradeImageQuality(computeImageSignals(gradient, W, H), 1000);
    expect(grade.quality).toBe("needs_review");
    expect(grade.warnings.join(" ")).toMatch(/blurry/i);
  });

  it("passes a sharp, well-exposed image", () => {
    const grade = gradeImageQuality(computeImageSignals(checker, W, H), 1000);
    expect(grade.quality).toBe("good");
    expect(grade.warnings).toHaveLength(0);
  });
});

describe("perceptualHash + duplicates", () => {
  it("hashes identical pixels to distance 0 and flags them as near-duplicates", () => {
    const a = perceptualHash(gradient, W, H);
    const b = perceptualHash(gradient, W, H);
    expect(a).toHaveLength(16);
    expect(hammingDistance(a, b)).toBe(0);
    expect(areNearDuplicates(a, b)).toBe(true);
  });

  it("keeps clearly different scenes apart", () => {
    const a = perceptualHash(gradient, W, H);
    const c = perceptualHash(
      buffer(W, H, (x, y) => {
        const v = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 230 : 25;
        return [v, v, v];
      }),
      W,
      H,
    );
    expect(areNearDuplicates(a, c)).toBe(false);
  });

  it("treats mismatched-length hashes as maximally distant", () => {
    expect(hammingDistance("abcd", "abcdef")).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("analyzeRegions", () => {
  it("classifies a fully green frame as greenery", () => {
    const green = buffer(W, H, () => [40, 160, 40]);
    const summary = analyzeRegions(green, W, H, 4, 4);
    expect(summary.cells).toHaveLength(16);
    expect(summary.greenRatio).toBeGreaterThan(0.8);
    expect(summary.cells.every((c) => c.cls === "greenery")).toBe(true);
  });

  it("separates a green top half from a paved bottom half", () => {
    const split = buffer(W, H, (_x, y) =>
      y < H / 2 ? [40, 160, 40] : [140, 140, 140],
    );
    const summary = analyzeRegions(split, W, H, 2, 2);
    expect(summary.greenRatio).toBeGreaterThan(0.4);
    expect(summary.hardscapeRatio).toBeGreaterThan(0.4);
    expect(summary.cells.filter((c) => c.row === 0).every((c) => c.cls === "greenery")).toBe(true);
    expect(summary.cells.filter((c) => c.row === 1).every((c) => c.cls === "hardscape")).toBe(true);
  });

  it("returns an empty summary for an invalid buffer", () => {
    expect(analyzeRegions(new Uint8ClampedArray(0), 0, 0).cells).toHaveLength(0);
  });
});
