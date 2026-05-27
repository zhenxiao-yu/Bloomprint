/** One-shot: deep-merge Landscape Toolbox i18n keys into en.json + zh.json (never overwrites). */
import { readFileSync, writeFileSync } from "node:fs";

const EN = {
  Nav: { toolbox: "Toolbox" },
  Toolbox: {
    badge: "Landscape Toolbox",
    title: "Landscape Toolbox",
    intro:
      "Quick, honest landscaping math — works offline, no AI needed. Every result is a range with its assumptions shown.",
    mulchTitle: "Mulch Calculator",
    mulchIntro: "How many bags of mulch you need for a bed, at a safe depth.",
    moreTitle: "More tools coming",
    soon: "Coming soon",
    tool_soil: "Soil Calculator",
    tool_gravel: "Gravel Calculator",
    tool_spacing: "Plant Spacing Calculator",
    tool_hedge: "Privacy Hedge Estimator",
    tool_sod: "Sod Calculator",
    tool_paver: "Paver Calculator",
    tool_edging: "Edging Calculator",
    tool_budget: "Budget Splitter",
    tool_labor: "Weekend Labor Estimator",
    shape: "Bed shape",
    shapeRectangle: "Rectangle",
    shapeCircle: "Circle",
    shapeArea: "Known area",
    units: "Units",
    unitsImperial: "Feet / inches",
    unitsMetric: "Meters / cm",
    length: "Length",
    width: "Width",
    radius: "Radius",
    area: "Area",
    depth: "Depth",
    extra: "Extra buffer",
    bagSize: "Bag size",
    bagSizeValue: "{size} cu ft",
    unitFt: "ft",
    unitM: "m",
    unitIn: "in",
    unitCm: "cm",
    unitSqFt: "sq ft",
    unitSqM: "sq m",
    unitCuFt: "cu ft",
    youNeed: "You need",
    bags: "bags",
    recommendedBags: "Recommended: {count} bags (with buffer)",
    bedArea: "Bed area",
    volume: "Mulch volume",
    depthWarningTitle: "That depth is too deep",
    depthWarningBody:
      "More than 3 in can suffocate roots and rot stems. Keep mulch 2–3 in deep, and pull it back from trunks and crowns.",
    assumptionsTitle: "Assumptions",
    assumptionsSummary: "How this estimate was calculated",
    assumeBag: "One bag = {size} cu ft of mulch.",
    assumeDepth: "Depth: {depth} in across the whole bed.",
    assumeBuffer: "Includes a {pct}% buffer for settling and uneven coverage.",
    disclaimer: "Estimate only. Measure your bed and confirm quantities before buying.",
    askAi: "Ask AI about this",
    applyToPlan: "Add to plan",
    aiSoonHint: "AI help arrives with the plan workspace.",
    applySoonHint: "Apply-to-plan arrives with the plan workspace.",
    optionalNote: "AI and apply-to-plan are optional — this calculator works on its own.",
    emptyTitle: "Enter your bed size",
    emptyBody: "Fill in the dimensions and depth to see how much mulch to buy.",
  },
};

const ZH = {
  Nav: { toolbox: "工具箱" },
  Toolbox: {
    badge: "庭院工具箱",
    title: "庭院工具箱",
    intro: "快速、诚实的园艺计算 —— 离线可用，无需 AI。每个结果都是带假设说明的区间。",
    mulchTitle: "覆盖物用量计算器",
    mulchIntro: "按安全厚度，算出一处花床需要多少袋覆盖物。",
    moreTitle: "更多工具即将上线",
    soon: "即将上线",
    tool_soil: "土壤用量计算器",
    tool_gravel: "砾石用量计算器",
    tool_spacing: "植物间距计算器",
    tool_hedge: "隐私绿篱估算器",
    tool_sod: "草皮用量计算器",
    tool_paver: "铺路砖计算器",
    tool_edging: "收边用量计算器",
    tool_budget: "预算分配器",
    tool_labor: "周末工时估算器",
    shape: "花床形状",
    shapeRectangle: "矩形",
    shapeCircle: "圆形",
    shapeArea: "已知面积",
    units: "单位",
    unitsImperial: "英尺 / 英寸",
    unitsMetric: "米 / 厘米",
    length: "长",
    width: "宽",
    radius: "半径",
    area: "面积",
    depth: "厚度",
    extra: "额外余量",
    bagSize: "每袋容量",
    bagSizeValue: "{size} 立方英尺",
    unitFt: "英尺",
    unitM: "米",
    unitIn: "英寸",
    unitCm: "厘米",
    unitSqFt: "平方英尺",
    unitSqM: "平方米",
    unitCuFt: "立方英尺",
    youNeed: "你需要",
    bags: "袋",
    recommendedBags: "建议：{count} 袋（含余量）",
    bedArea: "花床面积",
    volume: "覆盖物体积",
    depthWarningTitle: "厚度过厚",
    depthWarningBody:
      "超过 3 英寸会闷住根系、沤烂茎干。覆盖物保持 2–3 英寸，并从树干和根冠处往后扒开几英寸。",
    assumptionsTitle: "计算假设",
    assumptionsSummary: "本估算的计算方式",
    assumeBag: "每袋 = {size} 立方英尺覆盖物。",
    assumeDepth: "厚度：整床 {depth} 英寸。",
    assumeBuffer: "含 {pct}% 余量（用于沉降与不均匀铺撒）。",
    disclaimer: "仅为估算。购买前请实测花床并核对数量。",
    askAi: "向 AI 提问",
    applyToPlan: "添加到方案",
    aiSoonHint: "AI 协助将随方案工作台一起推出。",
    applySoonHint: "添加到方案将随方案工作台一起推出。",
    optionalNote: "AI 与添加到方案均为可选 —— 此计算器可独立使用。",
    emptyTitle: "输入花床尺寸",
    emptyBody: "填写尺寸与厚度，即可查看需购买的覆盖物用量。",
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
