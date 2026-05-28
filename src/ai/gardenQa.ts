/**
 * Bounded gardening Q&A (docs/DECISIONS.md D2/D4/D15). NOT a chatbot: a single-turn, length-
 * capped question answered with general horticultural guidance. DeepSeek-powered when configured,
 * deterministic mock otherwise — always Zod-validated. The AI may explain/teach but is instructed
 * never to invent prices, exact quantities, product names, or definitive plant-safety claims;
 * those stay locked to the deterministic engine. Output is honest, with a standing disclaimer.
 */
import { z } from "zod";

import { extractJson, generateText, textAiConfigured } from "@/ai/textClient";

export const GardenTopic = z.enum([
  "general",
  "planting",
  "watering",
  "pruning",
  "pests",
  "soil",
  "lawn",
]);
export type GardenTopic = z.infer<typeof GardenTopic>;

export const GardenQuestion = z.object({
  question: z.string().min(3).max(300),
  topic: GardenTopic.default("general"),
  region: z.string().max(120).optional(),
  locale: z.enum(["en", "zh"]).default("en"),
});
export type GardenQuestion = z.infer<typeof GardenQuestion>;

export const GardenAnswer = z.object({
  answer: z.string().min(1).max(1500),
  tips: z.array(z.string().max(200)).max(5).default([]),
  disclaimer: z.string(),
  /** "ai" when DeepSeek answered; "fallback" for the offline deterministic answer. */
  source: z.enum(["ai", "fallback"]),
});
export type GardenAnswer = z.infer<typeof GardenAnswer>;

const DISCLAIMER = {
  en: "General guidance, not site-specific advice — and never a substitute for a plant tag or local extension office. Bloomprint doesn't invent prices, exact quantities, or plant-safety claims; confirm those locally.",
  zh: "这是通用建议，并非针对你具体场地的意见，也不能替代植物标签或本地推广机构。Bloomprint 不编造价格、精确数量或植物安全性结论；请在本地核实。",
};

// Honest, fact-free topic guidance for the offline/no-key path. Teaches the approach without
// inventing specifics (prices, exact quantities, named products, definitive toxicity).
const FALLBACK: Record<GardenTopic, { en: string; zh: string }> = {
  general: {
    en: "Start from your conditions — hardiness zone, sun, soil, and water — then choose plants rated for them; that prevents most failures. For anything you'll buy or eat, confirm the specifics on the plant tag or with your local extension office.",
    zh: "先从你的条件入手——耐寒区、光照、土壤和水分——再选适配这些条件的植物，这能避免大多数失败。凡是要购买或食用的，请以植物标签或本地推广机构的信息为准。",
  },
  planting: {
    en: "Plant during your region's window (spring or early fall in most of the US/Canada), dig a hole as deep as the root ball and twice as wide, set the crown at grade, backfill, and water deeply. Space by the mature width on the tag, not the nursery-pot size.",
    zh: "在你所在地区的适宜窗口种植（北美多数地区为春季或初秋），挖一个与根球同深、两倍宽的坑，把根冠放在地面齐平处，回填后浇透。按标签上的成株宽度而非苗盆大小来定间距。",
  },
  watering: {
    en: "Water deeply and less often to push roots down; aim for about an inch a week for lawns, adjusting for rain and heat. New plants need closer attention for the first season. Morning watering reduces disease.",
    zh: "浇水要浇透、间隔拉长，促使根系下扎；草坪每周约 1 英寸，并按降雨和高温调整。新栽植物第一季需更勤照看。清晨浇水可减少病害。",
  },
  pruning: {
    en: "Prune most spring bloomers right after they flower, and summer bloomers in late winter; remove dead/damaged/crossing wood first. Never take more than about a third in one season, and cut just above an outward-facing bud.",
    zh: "多数春季开花植物在花后修剪，夏季开花植物在晚冬修剪；先去除枯死、受损和交叉的枝条。一季修剪不超过约三分之一，并在向外的芽点上方下剪。",
  },
  pests: {
    en: "Identify before you treat — most insects are harmless or beneficial. Start with the least-toxic step (hose off, hand-pick, encourage predators) and escalate only if needed. For identification or any product, confirm with a local source.",
    zh: "先识别再处理——多数昆虫无害甚至有益。从最低毒的方式开始（冲洗、手摘、招引天敌），必要时再升级。识别或选用任何药剂，请向本地来源核实。",
  },
  soil: {
    en: "A soil test is the only way to know your pH and nutrients — guess and you'll over- or under-apply. Most plants like well-drained soil rich in organic matter; topping with compost yearly fixes a lot. Match plants to your soil rather than fighting it.",
    zh: "土壤检测是了解 pH 和养分的唯一可靠方式——靠猜会施多或施少。多数植物喜欢富含有机质、排水良好的土壤；每年覆一层堆肥能解决很多问题。让植物适配你的土壤，而非硬改土壤。",
  },
  lawn: {
    en: "Mow high (about 3 in for cool-season grass), never cutting more than a third at once, and leave the clippings. Water deeply and infrequently. Overseed thin spots in early fall when soil is warm and nights cool.",
    zh: "高剪草（冷季型草约 3 英寸），每次不超过三分之一，并把碎草留下。浇水要透而稀。在初秋土温尚高、夜凉时给稀疏处补播。",
  },
};

export function mockGardenAnswer(q: GardenQuestion): GardenAnswer {
  const locale = q.locale === "zh" ? "zh" : "en";
  return GardenAnswer.parse({
    answer: FALLBACK[q.topic][locale],
    tips: [],
    disclaimer: DISCLAIMER[locale],
    source: "fallback",
  });
}

const AiShape = z.object({
  answer: z.string().min(1).max(1500),
  tips: z.array(z.string().max(200)).max(5).optional(),
});

/** Answer a bounded gardening question — DeepSeek when configured, deterministic mock otherwise. */
export async function answerGardenQuestion(raw: z.input<typeof GardenQuestion>): Promise<GardenAnswer> {
  const q = GardenQuestion.parse(raw);
  if (!textAiConfigured()) return mockGardenAnswer(q);

  const lang = q.locale === "zh" ? "Chinese" : "English";
  const system = `You are Bloomprint's gardening helper. Answer the user's single gardening question for a home gardener, in ${lang}.
RULES:
- General horticultural guidance only. Be concise (max 6 sentences) and practical.
- Do NOT invent specific prices, exact quantities, brand/product names, or definitive plant-safety/toxicity claims. If asked, tell them to confirm with the plant tag or a local extension office.
- Assume US/Canada cool-to-temperate climates unless a region is given.
Respond with ONLY a JSON object (no markdown): {"answer": string, "tips": string[] up to 4 short actionable tips}`;
  const user = `Region: ${q.region ?? "unspecified"}\nTopic: ${q.topic}\nQuestion: ${q.question}`;

  const raw2 = await generateText({ system, user, maxTokens: 600 });
  if (raw2) {
    try {
      const parsed = AiShape.safeParse(JSON.parse(extractJson(raw2)));
      if (parsed.success) {
        return GardenAnswer.parse({
          answer: parsed.data.answer,
          tips: parsed.data.tips ?? [],
          disclaimer: DISCLAIMER[q.locale === "zh" ? "zh" : "en"],
          source: "ai",
        });
      }
    } catch {
      /* fall through to mock */
    }
  }
  return mockGardenAnswer(q);
}
