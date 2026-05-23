import { describe, expect, it } from "vitest";
import { abbreviateLabel, dotRadius, spacingCircleRadius } from "../overlayGeometry";

describe("overlayGeometry", () => {
  it("scales the spacing circle with the plant scale", () => {
    const small = spacingCircleRadius(0.72, 500);
    const large = spacingCircleRadius(1.35, 500);
    expect(large).toBeGreaterThan(small);
  });

  it("clamps the spacing circle to readable bounds", () => {
    expect(spacingCircleRadius(0.01, 500)).toBe(500 * 0.04);
    expect(spacingCircleRadius(100, 500)).toBe(500 * 0.16);
  });

  it("keeps the dot radius within bounds", () => {
    expect(dotRadius(1, 500)).toBeGreaterThanOrEqual(5);
    expect(dotRadius(100, 500)).toBeLessThanOrEqual(16);
  });

  it("abbreviates long labels and leaves short ones intact", () => {
    expect(abbreviateLabel("Boxwood")).toBe("Boxwood");
    expect(abbreviateLabel("Eastern Redbud Tree", 14)).toBe("Eastern Redbu…");
  });
});
