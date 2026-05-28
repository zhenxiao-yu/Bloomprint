/** One-shot: deep-merge section-copilot i18n keys into en.json + zh.json (never overwrites). */
import { readFileSync, writeFileSync } from "node:fs";

const EN = {
  Copilot: {
    askAi: "Ask AI",
    title: "Ask about {section}",
    titleGeneric: "Ask about this plan",
    disclaimer:
      "Explains your plan only — it never changes the numbers. Apply a suggestion to actually adjust it.",
    tryAsking: "Try asking",
    placeholder: "Ask about this section…",
    ask: "Ask",
    thinking: "Thinking…",
    error: "Couldn't answer right now. Try a suggestion below.",
    turnIntoChange: "Turn this into a change",
    applied: "Applied: {label}",
    promptsPlants: ["Why these plants?", "Which are dog-safe?", "What are cheaper alternatives?"],
    promptsBudget: ["Make this cheaper", "What can wait?", "Where am I overspending?"],
  },
};

const ZH = {
  Copilot: {
    askAi: "问 AI",
    title: "询问：{section}",
    titleGeneric: "询问这份方案",
    disclaimer: "仅解释你的方案——它不会更改数字。应用某条建议才能真正调整方案。",
    tryAsking: "试试这样问",
    placeholder: "就这一部分提问……",
    ask: "提问",
    thinking: "思考中……",
    error: "暂时无法回答。可以试试下方的建议。",
    turnIntoChange: "把它变成一处调整",
    applied: "已应用：{label}",
    promptsPlants: ["为什么选这些植物？", "哪些对狗狗安全？", "有没有更便宜的替代？"],
    promptsBudget: ["让它更便宜", "哪些可以缓一缓？", "我在哪里花多了？"],
  },
};

function mergeMissing(dst, src) {
  let added = 0;
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
      if (!dst[k] || typeof dst[k] !== "object" || Array.isArray(dst[k])) dst[k] = {};
      added += mergeMissing(dst[k], src[k]);
    } else if (!(k in dst)) {
      dst[k] = src[k];
      added++;
    }
  }
  return added;
}

for (const [file, patch] of [
  ["messages/en.json", EN],
  ["messages/zh.json", ZH],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const added = mergeMissing(json, patch);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: +${added} keys`);
}
