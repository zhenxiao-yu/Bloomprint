import { readFileSync, writeFileSync } from "node:fs";

const CATEGORY = { en: "Garden AI", zh: "园艺 AI" };

const T = {
  en: {
    title: "Garden AI Helper",
    intro: "Ask a gardening question and get concise, honest guidance — powered by DeepSeek, with a built-in offline fallback.",
    topic: "Topic",
    topic_general: "General",
    topic_planting: "Planting",
    topic_watering: "Watering",
    topic_pruning: "Pruning",
    topic_pests: "Pests",
    topic_soil: "Soil",
    topic_lawn: "Lawn",
    placeholder: "e.g. When should I prune hydrangeas?",
    ask: "Ask",
    loading: "Thinking…",
    error: "Couldn't answer right now — try again.",
    aiBadge: "DeepSeek",
    offlineBadge: "Offline guidance",
    tipsTitle: "Tips",
    tryAsking: "Try asking",
    prompts: [
      "When should I prune hydrangeas?",
      "Why are my tomato leaves turning yellow?",
      "How often should I water newly planted shrubs?",
    ],
    formula: "your question → DeepSeek (or offline guidance) → answer + tips",
    how: "A single gardening question, answered concisely. When a DeepSeek key is configured it writes the reply; otherwise you get built-in guidance. Either way it sticks to general horticulture and won't invent prices, quantities, or plant-safety claims.",
    evidence: [
      "Powered by DeepSeek when configured; deterministic offline guidance otherwise.",
      "General guidance only — confirm specifics on the plant tag or with a local extension office.",
      "No prices, exact quantities, brand names, or safety claims are invented.",
    ],
    emptyTitle: "Ask a gardening question",
    emptyBody: "Pick a topic and type your question.",
  },
  zh: {
    title: "园艺 AI 助手",
    intro: "提一个园艺问题，获得简明、靠谱的建议——由 DeepSeek 驱动，并内置离线兜底。",
    topic: "话题",
    topic_general: "综合",
    topic_planting: "种植",
    topic_watering: "浇水",
    topic_pruning: "修剪",
    topic_pests: "病虫害",
    topic_soil: "土壤",
    topic_lawn: "草坪",
    placeholder: "例如：绣球什么时候修剪？",
    ask: "提问",
    loading: "思考中……",
    error: "暂时无法回答——请重试。",
    aiBadge: "DeepSeek",
    offlineBadge: "离线建议",
    tipsTitle: "小贴士",
    tryAsking: "试试这样问",
    prompts: ["绣球什么时候修剪？", "番茄叶子为什么发黄？", "新栽灌木要多久浇一次水？"],
    formula: "你的问题 → DeepSeek（或离线建议）→ 回答 + 小贴士",
    how: "单轮园艺问答，简明作答。配置了 DeepSeek 密钥时由它撰写回答；否则使用内置建议。无论哪种方式都只给通用园艺知识，不编造价格、数量或植物安全性结论。",
    evidence: [
      "配置后由 DeepSeek 驱动；否则为确定性的离线建议。",
      "仅为通用建议——具体信息请以植物标签或本地推广机构为准。",
      "不编造价格、精确数量、品牌名或安全性结论。",
    ],
    emptyTitle: "提一个园艺问题",
    emptyBody: "选一个话题并输入你的问题。",
  },
};

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.Toolbox.category.ai = CATEGORY[locale];
  json.Tools.gardenAi = T[locale];
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: Tools=[${Object.keys(json.Tools).join(",")}]`);
}
