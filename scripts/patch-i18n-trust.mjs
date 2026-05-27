/** One-shot: deep-merge Trust badge i18n keys into en.json + zh.json (never overwrites). */
import { readFileSync, writeFileSync } from "node:fs";

const EN = {
  Trust: {
    confidence: "Confidence",
    confidence_low: "Low",
    confidence_medium: "Medium",
    confidence_good: "Good",
    confidence_high: "High",
    confidenceTip:
      "Our honest read on how well this fits your site. Lower confidence means more local checks — never a worse plan.",
    assumption: "Assumption",
    assumptionTip:
      "We assumed this because it wasn't specified. Confirm your site details to sharpen the plan.",
    verifiedLabel: "Verified",
    verifyLabel: "Verify locally",
    estimateLabel: "Estimate",
    verifiedTip: "Confirmed against a trusted source.",
    verifyTip:
      "Approximate — confirm locally (stock, price, fit, or measurements) before you rely on it.",
    estimateTip: "A planning estimate, not a guaranteed exact figure.",
  },
};

const ZH = {
  Trust: {
    confidence: "置信度",
    confidence_low: "低",
    confidence_medium: "中",
    confidence_good: "较好",
    confidence_high: "高",
    confidenceTip: "我们对它与你场地契合度的诚实判断。置信度较低意味着需要更多本地核实——而非方案更差。",
    assumption: "假设",
    assumptionTip: "因为没有指定，我们先做了这个假设。补充场地信息可让方案更精准。",
    verifiedLabel: "已核实",
    verifyLabel: "请本地核实",
    estimateLabel: "估算",
    verifiedTip: "已与可信来源核对确认。",
    verifyTip: "为近似值——在依赖之前，请在本地核实（库存、价格、适配性或尺寸）。",
    estimateTip: "为规划用的估算，并非保证的精确数值。",
  },
};

function mergeMissing(dst, src) {
  let added = 0;
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
      if (!dst[k] || typeof dst[k] !== "object") dst[k] = {};
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
