/**
 * Deterministic mock vision provider — no network, no API key.
 *
 * Lets the whole yard-vision feature work with AI_PROVIDER=mock and no real
 * backend. It returns a plausible but clearly GENERIC result (it does not
 * actually look at the image) so nothing is invented as fact and the user is
 * always invited to confirm.
 *
 * Future real providers (Qwen-VL, Gemini, GLM, OpenAI, or the existing Claude
 * provider in src/lib/visionProvider.ts) implement the same
 * `YardVisionProvider` interface and can be swapped in transparently.
 */
import { YardVisionProvider, YardVisionResult } from "./types";

export const mockVisionProvider: YardVisionProvider = {
  name: "mock",
  async analyze(): Promise<YardVisionResult | null> {
    return YardVisionResult.parse({
      visibleElements: ["an open lawn area", "a fence along one edge", "some existing shrubs"],
      positives: ["a good amount of open space to work with", "an existing border to build against"],
      negatives: ["unclear soil condition from a photo alone"],
      opportunities: ["a planting bed along the fence line", "a defined edge between lawn and beds"],
      uncertainties: ["exact sun hours", "real-world dimensions", "drainage and slope"],
      sun: "unknown",
      note: "Generic example read — confirm details on site before planning.",
    });
  },
};
