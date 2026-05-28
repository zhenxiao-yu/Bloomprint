import { describe, expect, it } from "vitest";

import { GardenAnswer, answerGardenQuestion, mockGardenAnswer } from "@/ai/gardenQa";

describe("gardenQa (mock-first, honest)", () => {
  it("returns a Zod-valid fallback answer with no AI key configured", async () => {
    const a = await answerGardenQuestion({ question: "How do I prune my roses?", topic: "pruning" });
    expect(() => GardenAnswer.parse(a)).not.toThrow();
    expect(a.source).toBe("fallback");
    expect(a.answer.length).toBeGreaterThan(0);
    expect(a.disclaimer).toBeTruthy();
  });

  it("localizes the fallback + disclaimer to zh", () => {
    const a = mockGardenAnswer({ question: "浇水频率？", topic: "watering", locale: "zh" });
    expect(a.disclaimer).toContain("本地");
    expect(a.answer).toMatch(/[一-鿿]/);
  });

  it("rejects an over-long question at the schema boundary", async () => {
    await expect(answerGardenQuestion({ question: "x".repeat(400) })).rejects.toBeTruthy();
  });

  it("covers every topic with non-empty guidance", () => {
    for (const topic of ["general", "planting", "watering", "pruning", "pests", "soil", "lawn"] as const) {
      expect(mockGardenAnswer({ question: "q", topic, locale: "en" }).answer.length).toBeGreaterThan(20);
    }
  });
});
