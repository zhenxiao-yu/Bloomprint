import { describe, expect, it } from "vitest";
import {
  answerSectionQuestion,
  mockSectionAnswer,
  SectionAnswer,
  SectionQuestion,
} from "@/ai/sectionCopilot";

describe("mockSectionAnswer", () => {
  it("explains the section without inventing facts, in the requested locale", () => {
    const a = mockSectionAnswer({
      sectionType: "budget",
      question: "why is this so expensive?",
      locale: "en",
    });
    expect(a.answer).toMatch(/estimate range/i);
    expect(a.disclaimer).toMatch(/never invents/i);
    // It must not fabricate a concrete number.
    expect(a.answer).not.toMatch(/\$\d/);
  });

  it("maps change-intent in the question to refinement suggestions (no freeform mutation)", () => {
    const a = mockSectionAnswer({
      sectionType: "budget",
      question: "can you make this cheaper please",
      locale: "en",
    });
    expect(a.suggestedRefinements).toContain("cheaper");
  });

  it("returns no suggestions for a pure explanation question", () => {
    const a = mockSectionAnswer({ sectionType: "plants", question: "why these plants?", locale: "en" });
    expect(a.suggestedRefinements).toEqual([]);
  });

  it("answers in Simplified Chinese when locale=zh", () => {
    const a = mockSectionAnswer({ sectionType: "store", question: "有货吗", locale: "zh" });
    expect(a.answer).toMatch(/[一-鿿]/); // contains CJK
    expect(a.disclaimer).toMatch(/[一-鿿]/);
  });

  it("every section type produces a non-empty, schema-valid answer", () => {
    for (const sectionType of SectionType_values()) {
      const a = mockSectionAnswer({ sectionType, question: "explain", locale: "en" });
      expect(() => SectionAnswer.parse(a)).not.toThrow();
      expect(a.answer.length).toBeGreaterThan(20);
    }
  });
});

describe("answerSectionQuestion", () => {
  it("returns a Zod-valid bounded answer", async () => {
    const a = await answerSectionQuestion({
      sectionType: "general",
      question: "make it cheaper",
      locale: "en",
    });
    expect(() => SectionAnswer.parse(a)).not.toThrow();
    expect(a.suggestedRefinements).toContain("cheaper");
  });
});

describe("SectionQuestion bounds", () => {
  it("rejects an over-long question and empty input", () => {
    expect(SectionQuestion.safeParse({ sectionType: "budget", question: "" }).success).toBe(false);
    expect(
      SectionQuestion.safeParse({ sectionType: "budget", question: "x".repeat(401) }).success,
    ).toBe(false);
  });
});

function SectionType_values() {
  return [
    "summary",
    "budget",
    "shopping",
    "timeline",
    "plants",
    "risks",
    "store",
    "evidence",
    "general",
  ] as const;
}
