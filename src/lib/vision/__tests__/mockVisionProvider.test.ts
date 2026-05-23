import { describe, expect, it } from "vitest";
import { mockVisionProvider } from "@/lib/vision/mockVisionProvider";
import { YardVisionResult } from "@/lib/vision/types";

describe("mockVisionProvider", () => {
  it("is named and key-free", () => {
    expect(mockVisionProvider.name).toBe("mock");
  });

  it("returns a schema-valid result with non-empty arrays", async () => {
    const result = await mockVisionProvider.analyze({ base64: "x", mediaType: "image/jpeg" });
    expect(result).not.toBeNull();
    const parsed = YardVisionResult.safeParse(result);
    expect(parsed.success).toBe(true);
    expect(result!.visibleElements.length).toBeGreaterThan(0);
    expect(result!.opportunities.length).toBeGreaterThan(0);
    expect(result!.uncertainties.length).toBeGreaterThan(0);
    expect(result!.sun).toBe("unknown");
  });
});
