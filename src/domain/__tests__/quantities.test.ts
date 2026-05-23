import { describe, expect, it } from "vitest";
import { measurementToSqft, estimateMaterialQuantity } from "@/domain/estimation/quantities";
import type { Measurement } from "@/domain/models";

describe("measurement → area", () => {
  it("uses explicit area, converting metres to sqft", () => {
    expect(measurementToSqft({ area: 10, unit: "ft", source: "manual", confidence: "good" })).toBe(10);
    expect(measurementToSqft({ area: 10, unit: "m", source: "manual", confidence: "good" })).toBeCloseTo(107.6, 0);
  });

  it("multiplies length × width when area is absent", () => {
    expect(measurementToSqft({ length: 4, width: 3, unit: "ft", source: "manual", confidence: "good" })).toBe(12);
  });

  it("returns undefined when there is no usable size", () => {
    expect(measurementToSqft(undefined)).toBeUndefined();
    expect(measurementToSqft({ unit: "ft", source: "estimated", confidence: "low" })).toBeUndefined();
  });
});

describe("estimateMaterialQuantity returns honest ranges", () => {
  const measured = (confidence: Measurement["confidence"]): Measurement => ({
    length: 20, width: 4, unit: "ft", source: "manual", confidence,
  }); // 80 sqft

  it("returns null when measurement carries no size (caller falls back to area rules)", () => {
    expect(estimateMaterialQuantity(undefined, "mulch")).toBeNull();
  });

  it("produces a low<high range, wider for low confidence", () => {
    const low = estimateMaterialQuantity(measured("low"), "mulch")!;
    const high = estimateMaterialQuantity(measured("high"), "mulch")!;
    expect(low.range.low).toBeLessThan(low.range.high);
    const lowSpread = low.range.high - low.range.low;
    const highSpread = high.range.high - high.range.low;
    expect(lowSpread).toBeGreaterThanOrEqual(highSpread);
    expect(low.unit).toBe("bag");
  });

  it("treats edging as linear feet and lighting as fixtures", () => {
    expect(estimateMaterialQuantity(measured("good"), "edging")!.unit).toBe("linear-ft");
    expect(estimateMaterialQuantity(measured("good"), "lighting")!.unit).toBe("fixture");
  });
});
