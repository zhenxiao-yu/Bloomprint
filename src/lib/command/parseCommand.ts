/**
 * Constrained command parser — turns a free-text request into the app's EXISTING
 * structured refinements. This is NOT a chatbot: it never generates prose and can
 * only map language onto the fixed RefinementAdjustment vocabulary the deterministic
 * engine already understands (docs/DECISIONS.md — AI/NL extracts, engine decides).
 *
 * Matching is deterministic keyword/synonym lookup in English + Simplified Chinese,
 * so it works with no AI key. A future AI intent provider may produce the same
 * structured output, but it must be Zod-validated against RefinementAdjustment and
 * can never invent an action outside this list.
 */
import { REFINEMENTS } from "@/lib/uiOptions";
import type { RefinementAdjustment } from "@/domain/models";

// Synonyms per refinement (lowercased substrings). EN + ZH.
const SYNONYMS: Record<RefinementAdjustment, string[]> = {
  cheaper: ["cheap", "cheaper", "budget", "afford", "less expensive", "lower cost", "save money", "便宜", "省钱", "预算", "降低预算", "实惠"],
  easier: ["easier", "easy", "simpler", "less work", "low effort", "one person", "省事", "简单", "轻松", "少干活", "一个人"],
  "less-trimming": ["less trimming", "less pruning", "no trimming", "less prune", "low upkeep", "少修剪", "不用修剪", "少打理", "免修剪"],
  "more-flowers": ["more flowers", "flowering", "blooms", "bloom", "多点花", "多花", "开花", "花多"],
  "more-colorful": ["colorful", "more color", "vibrant", "bright", "多彩", "颜色", "鲜艳", "色彩"],
  "more-privacy": ["privacy", "private", "block the view", "block view", "screen", "hide neighbor", "隐私", "遮挡", "挡住", "私密", "遮蔽"],
  "more-shade": ["shade", "shady", "less sun", "shade-tolerant", "遮阴", "阴面", "少日照", "背阴"],
  "more-modern": ["modern", "contemporary", "clean look", "minimal", "现代", "简约", "时尚"],
  "premium-look": ["premium", "luxury", "high-end", "high end", "upscale", "looks expensive", "高端", "高级", "豪华", "看起来贵"],
  "better-resale": ["resale", "resell", "sell the house", "home value", "property value", "转售", "卖房", "增值", "房价"],
  "better-winter": ["winter", "cold", "winter interest", "evergreen", "冬天", "耐寒", "冬季", "常绿"],
  "wildlife-friendly": ["wildlife", "birds", "bees", "butterfl", "pollinator", "野生动物", "鸟", "蜜蜂", "蝴蝶", "传粉"],
  "dog-safe": ["dog", "pet", "puppy", "kid safe", "kids safe", "child safe", "non-toxic", "nontoxic", "狗", "宠物", "孩子", "无毒", "安全"],
  "salt-safe": ["salt", "road salt", "de-icing", "deicing", "salt-tolerant", "融雪盐", "耐盐", "盐"],
  "less-watering": ["less water", "drought", "water-wise", "water wise", "low water", "dry tolerant", "少浇水", "耐旱", "节水", "省水"],
  "stone-to-mulch": ["mulch instead", "less stone", "stone to mulch", "replace stone", "no stone", "木屑", "覆盖物", "少用石头", "石头换", "不要石头"],
};

const ORDER = REFINEMENTS.map((r) => r.value);

export interface CommandParseResult {
  /** Refinements matched, in canonical REFINEMENTS order, de-duplicated. */
  matched: RefinementAdjustment[];
  /** True when the user typed something but nothing mapped to a known refinement. */
  unmatched: boolean;
}

export function parseCommand(text: string): CommandParseResult {
  const q = text.trim().toLowerCase();
  if (!q) return { matched: [], unmatched: false };

  const hit = new Set<RefinementAdjustment>();
  for (const value of ORDER) {
    if (SYNONYMS[value].some((kw) => q.includes(kw))) hit.add(value);
  }
  const matched = ORDER.filter((v) => hit.has(v));
  return { matched, unmatched: matched.length === 0 };
}
