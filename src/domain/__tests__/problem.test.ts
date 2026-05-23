import { describe, expect, it } from "vitest";
import { PROBLEM_TO_GOAL, mapProblemToGoal, deriveInputCapture } from "@/domain/problem";
import { ProblemType, type YardIntake } from "@/domain/models";

const base: YardIntake = { regionId: "gta-ontario", goal: "general", effortLevel: "moderate", hasPhoto: false, sun: "unknown", soil: "unknown", drainage: "unknown" };

describe("problem-language mapping", () => {
  it("maps every ProblemType to a real ProjectGoal", () => {
    for (const problem of ProblemType.options) {
      expect(mapProblemToGoal(problem)).toBe(PROBLEM_TO_GOAL[problem]);
    }
    expect(mapProblemToGoal("privacy_gap")).toBe("privacy");
    expect(mapProblemToGoal("shady_bare_spot")).toBe("shade-tolerant");
  });

  it("derives input capture by precedence: ar_scan > photo > manual dims > none", () => {
    expect(deriveInputCapture(base)).toBe("no_photo");
    expect(deriveInputCapture({ ...base, hasPhoto: true })).toBe("photo");
    expect(deriveInputCapture({ ...base, measurement: { length: 4, width: 2, unit: "m", source: "manual", confidence: "good" } })).toBe("manual_dimensions");
    expect(deriveInputCapture({ ...base, hasPhoto: true, measurement: { unit: "ft", source: "ar_scan", confidence: "high" } })).toBe("ar_scan");
  });
});
