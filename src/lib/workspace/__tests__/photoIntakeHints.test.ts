import { describe, expect, it } from "vitest";
import { derivePhotoIntake } from "@/lib/workspace/photoAnalysis";

describe("derivePhotoIntake", () => {
  it("maps a front-yard shot to a foundation bed, single-section scope", () => {
    const d = derivePhotoIntake({ photoTypes: ["front_yard"] });
    expect(d.areaType).toBe("foundation-bed");
    expect(d.scope).toBe("section_plan");
    expect(d.problemType).toBeUndefined();
  });

  it("reads a side-yard shot as a privacy gap on the fence line", () => {
    const d = derivePhotoIntake({ photoTypes: ["side_yard"] });
    expect(d.areaType).toBe("fence-line");
    expect(d.problemType).toBe("privacy_gap");
  });

  it("treats a user-labelled drainage shot as poor drainage", () => {
    const d = derivePhotoIntake({ photoTypes: ["soil_drainage"] });
    expect(d.problemType).toBe("muddy_erosion");
    expect(d.drainage).toBe("poor");
  });

  it("widens scope to the whole area when front and back are both covered", () => {
    expect(derivePhotoIntake({ photoTypes: ["front_yard", "backyard"] }).scope).toBe("whole_area_plan");
  });

  it("narrows scope to a spot fix for a lone problem-area shot", () => {
    expect(derivePhotoIntake({ photoTypes: ["problem_area"] }).scope).toBe("spot_fix");
  });

  it("trusts the vision sun estimate but ignores an unknown one", () => {
    expect(derivePhotoIntake({ photoTypes: ["front_yard"], visionSun: "shade" }).sun).toBe("shade");
    expect(derivePhotoIntake({ photoTypes: ["front_yard"], visionSun: "unknown" }).sun).toBeUndefined();
  });

  it("passes through region ratios and never fabricates an area measurement", () => {
    const d = derivePhotoIntake({
      photoTypes: ["front_yard"],
      region: { greenRatio: 0.5, hardscapeRatio: 0.2, skyRatio: 0.1, shadowRatio: 0.1 },
    });
    expect(d.greeneryRatio).toBeCloseTo(0.5);
    expect(d).not.toHaveProperty("areaSqft");
  });
});
