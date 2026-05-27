/**
 * Bounded section copilot (docs/DECISIONS.md D15 — amends D4).
 *
 * A TIGHTLY-SCOPED question answerer for a single plan section. It is NOT a chatbot:
 *  - it answers only about the section it's given (no open conversation, no memory);
 *  - it EXPLAINS, it never changes a fact — output is Zod-validated to explanation text
 *    plus suggested refinements drawn ONLY from the fixed RefinementAdjustment vocabulary;
 *  - "turn this into a change" routes through the existing deterministic refinement flow
 *    (parseCommand → onRefine → /api/plan), never a freeform mutation;
 *  - it is mock-first: with AI_PROVIDER=mock (default, no key) it returns honest, deterministic
 *    guidance that never invents prices, quantities, plants, or other locked facts.
 */
import { z } from "zod";
import { RefinementAdjustment } from "@/domain/models";
import { parseCommand } from "@/lib/command/parseCommand";

export const SectionType = z.enum([
  "summary",
  "budget",
  "shopping",
  "timeline",
  "plants",
  "risks",
  "store",
  "evidence",
  "general",
]);
export type SectionType = z.infer<typeof SectionType>;

/** Slim, bounded request — caps lengths so it can never become a freeform prompt dump. */
export const SectionQuestion = z.object({
  sectionType: SectionType,
  sectionTitle: z.string().max(120).optional(),
  question: z.string().min(1).max(400),
  region: z.string().max(120).optional(),
  locale: z.enum(["en", "zh"]).default("en"),
});
export type SectionQuestion = z.infer<typeof SectionQuestion>;

/** Bounded answer — explanation text + change suggestions from the fixed vocabulary only. */
export const SectionAnswer = z.object({
  answer: z.string(),
  /** Refinements the user can apply to actually change the plan (deterministic re-run). */
  suggestedRefinements: z.array(RefinementAdjustment).default([]),
  disclaimer: z.string(),
});
export type SectionAnswer = z.infer<typeof SectionAnswer>;

// Honest, fact-free per-section explanations. They describe WHAT the section means and HOW to
// act on it — never specific prices/quantities/plants (those stay locked in the engine output).
const EXPLAIN: Record<SectionType, { en: string; zh: string }> = {
  summary: {
    en: "This is your plan's confidence read and headline numbers, straight from Bloomprint's deterministic engine — never invented. Lower confidence just means more local checks, not a worse plan. To reshape it, apply a refinement below.",
    zh: "这是方案的置信度判断与核心数据，全部来自 Bloomprint 的确定性引擎，绝非凭空生成。置信度较低只代表需要更多本地核实，而非方案更差。要调整，请在下方应用一个细化项。",
  },
  budget: {
    en: "The budget is a DIY estimate range from the Core Library — planning guidance, not a checkout price. To spend less, apply the 'cheaper' refinement; the numbers update from the engine, not from this answer.",
    zh: "预算是来自核心库的自助（DIY）估算区间——用于规划，并非结账价格。想花得更少，可应用“更便宜”细化项；数字由引擎更新，而非此回答。",
  },
  shopping: {
    en: "The shopping list comes from your plan's plants and materials with honest quantities. Prices are estimate ranges — confirm with the retailer. Use 'Find links' to search local stores.",
    zh: "购物清单来自方案中的植物与材料，数量如实给出。价格为估算区间——请与商家确认。可用“查找链接”搜索本地门店。",
  },
  timeline: {
    en: "The install timeline orders the work so nothing gets redone. Times are estimates and vary with experience and access. Ask for an 'easier' version to lower the effort.",
    zh: "施工时间线对工序排序，避免返工。用时为估算，因经验和场地条件而异。可应用“更省力”版本来降低强度。",
  },
  plants: {
    en: "These plants were scored against your site's sun, soil, space, and hardiness — those facts stay locked. To re-pick, apply refinements like 'dog-safe', 'more flowers', or 'less watering'.",
    zh: "这些植物已按你场地的光照、土壤、空间和耐寒性评分——这些事实保持锁定。要重新挑选，可应用“宠物友好”“更多花”或“更少浇水”等细化项。",
  },
  risks: {
    en: "Risks are flagged honestly, each with a mitigation. They're cautions, not certainties. If a risk worries you, a refinement (e.g. 'easier', 'less watering') can often reduce it.",
    zh: "风险均如实标注，并附缓解措施。它们是提醒，而非必然。若某项风险让你担心，应用细化项（如“更省力”“更少浇水”）通常能降低它。",
  },
  store: {
    en: "The Store Reality Check gives search links and an availability state — never guaranteed stock or a final price. Always verify with the store before buying.",
    zh: "门店实情核对提供搜索链接和库存状态——绝不保证有货或给出最终价格。购买前请务必与门店核实。",
  },
  evidence: {
    en: "Evidence shows the sources behind your plan, ranked on a quality ladder. AI only shapes wording; it never drives the facts.",
    zh: "依据展示了方案背后的来源，并按质量阶梯排序。AI 只润色措辞，绝不决定事实。",
  },
  general: {
    en: "Bloomprint explains your plan and can re-run it with refinements — it never changes the numbers itself. Pick a refinement to actually adjust the plan.",
    zh: "Bloomprint 会解释你的方案，并能用细化项重新生成——但它自己绝不更改数字。选择一个细化项即可真正调整方案。",
  },
};

const DISCLAIMER = {
  en: "Bloomprint explains your deterministic plan; it never invents prices, quantities, or facts. Apply a refinement to actually change the plan.",
  zh: "Bloomprint 只解释你的确定性方案；它绝不编造价格、数量或事实。应用细化项才能真正改变方案。",
};

/**
 * Deterministic, offline, fact-safe answer for a section question. This is the default
 * (AI_PROVIDER=mock) and the floor every real provider must not fall below: explanation only,
 * with change-intents mapped onto the fixed refinement vocabulary via parseCommand.
 */
export function mockSectionAnswer(q: SectionQuestion): SectionAnswer {
  const locale = q.locale === "zh" ? "zh" : "en";
  const explanation = EXPLAIN[q.sectionType][locale];
  // Reuse the deterministic NL→refinement parser so any change-intent in the question becomes
  // an actionable chip — never a freeform mutation.
  const suggestedRefinements = parseCommand(q.question).matched;
  return {
    answer: explanation,
    suggestedRefinements,
    disclaimer: DISCLAIMER[locale],
  };
}

/**
 * Resolve a bounded section answer. Today this is always the deterministic mock; a real provider
 * can later supply richer wording behind the SAME bounded schema (explanation + vocabulary
 * refinements), Zod-validated, never returning plan facts. Always returns a valid answer.
 */
export async function answerSectionQuestion(q: SectionQuestion): Promise<SectionAnswer> {
  // Validate output shape even for the mock, so the boundary is identical for future providers.
  return SectionAnswer.parse(mockSectionAnswer(q));
}
