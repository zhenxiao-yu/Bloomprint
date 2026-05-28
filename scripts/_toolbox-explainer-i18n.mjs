/** Commit A: explainer keys + grouped Tools.material; drop soil/compost/gravel; add formula/how/evidence. */
import { readFileSync, writeFileSync } from "node:fs";

const DROP = ["soil", "compost", "gravel"];

const SET = {
  en: {
    common: {
      howItWorks: "How this works",
      evidence: "Why these numbers",
      material: "Material",
    },
    tools: {
      material: {
        title: "Material Calculator",
        intro:
          "How much topsoil, compost, gravel, sand, or bark to cover an area — by bag, cubic yard, or estimated tons.",
        emptyTitle: "Enter your area",
        emptyBody: "Pick a material and fill in the area and depth.",
        formula: "bags = ⌈ area × depth ÷ bag volume ⌉ + buffer   ·   cu yd = volume ÷ 27",
        how: "Area × depth gives the loose volume to fill. We round up to whole bags and add a buffer for settling and waste; bulk delivery is shown in cubic yards (and an estimated weight for stone).",
        evidence: [
          "Bagged material is ~1–2 cu ft; the default bag size changes per material.",
          "1 cubic yard = 27 cubic feet.",
          "Stone weighs roughly 1.4 tons per cubic yard — it varies by stone, so it is shown as a range.",
        ],
        materials: {
          topsoil: "Topsoil",
          compost: "Compost",
          gravel: "Gravel / crushed stone",
          river_rock: "River rock",
          sand: "Sand",
          bark: "Bark / wood chips",
        },
      },
      mulch: {
        formula: "bags = ⌈ area × depth ÷ bag volume ⌉ + buffer",
        how: "Area × depth is how much mulch fills the bed. We round up to whole bags and add a buffer; recommended depth is held at 2–3 in to protect roots.",
        evidence: [
          "A standard bag holds 2 cu ft of mulch.",
          "2–3 in is the horticultural sweet spot — deeper can suffocate roots and rot stems.",
          "The buffer covers settling and uneven coverage.",
        ],
      },
      edging: {
        formula: "pieces = ⌈ perimeter ÷ piece length ⌉ + buffer",
        how: "Perimeter is the distance around the bed. Divide by the length of each edging section, round up, and add a buffer for corner cuts and overlap.",
        evidence: [
          "Rigid and coiled edging commonly comes in ~8 ft sections.",
          "The buffer covers corner cuts and overlap.",
        ],
      },
      bedArea: {
        formula: "rectangle = L × W   ·   circle = π × r²",
        how: "Enter a shape and its dimensions; we report the area in both sq ft and sq m, plus the perimeter where the shape has one.",
        evidence: ["1 sq m = 10.764 sq ft.", "Drop this area into any of the material calculators."],
      },
    },
  },
  zh: {
    common: {
      howItWorks: "计算原理",
      evidence: "数字依据",
      material: "材料",
    },
    tools: {
      material: {
        title: "材料计算器",
        intro: "覆盖一片区域需要多少表层土、堆肥、砾石、沙或树皮——按袋、按立方码或估算吨数。",
        emptyTitle: "输入区域面积",
        emptyBody: "选择材料并填好面积和厚度。",
        formula: "袋数 = ⌈ 面积 × 厚度 ÷ 每袋体积 ⌉ + 余量   ·   立方码 = 体积 ÷ 27",
        how: "面积 × 厚度得到所需的松散体积。我们向上取整到整袋并加上余量（沉降和损耗）；散装配送以立方码显示（碎石还给出估算重量）。",
        evidence: [
          "袋装材料约 1–2 立方英尺；每种材料的默认袋容量不同。",
          "1 立方码 = 27 立方英尺。",
          "碎石每立方码约 1.4 吨——因石材而异，故以区间显示。",
        ],
        materials: {
          topsoil: "表层土",
          compost: "堆肥",
          gravel: "砾石 / 碎石",
          river_rock: "河石",
          sand: "沙",
          bark: "树皮 / 木屑",
        },
      },
      mulch: {
        formula: "袋数 = ⌈ 面积 × 厚度 ÷ 每袋体积 ⌉ + 余量",
        how: "面积 × 厚度即覆盖物填满花床的量。我们向上取整到整袋并加余量；建议厚度保持 2–3 英寸以保护根系。",
        evidence: [
          "标准每袋装 2 立方英尺覆盖物。",
          "2–3 英寸是最佳厚度——过厚会闷住根系、沤烂茎干。",
          "余量用于沉降和铺撒不均。",
        ],
      },
      edging: {
        formula: "段数 = ⌈ 周长 ÷ 每段长度 ⌉ + 余量",
        how: "周长是花床一圈的长度。除以每段收边材料的长度并向上取整，再加余量（拐角裁切和搭接）。",
        evidence: ["硬质和卷材收边通常约 8 英尺一段。", "余量用于拐角裁切和搭接。"],
      },
      bedArea: {
        formula: "矩形 = 长 × 宽   ·   圆形 = π × r²",
        how: "输入形状及其尺寸；我们以平方英尺和平方米两种单位给出面积，并在形状有周长时给出周长。",
        evidence: ["1 平方米 = 10.764 平方英尺。", "把这个面积填进任意材料计算器即可。"],
      },
    },
  },
};

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  Object.assign(json.Toolbox.common, SET[locale].common);
  for (const slug of DROP) delete json.Tools[slug];
  for (const [slug, block] of Object.entries(SET[locale].tools)) {
    json.Tools[slug] = { ...(json.Tools[slug] ?? {}), ...block };
  }
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  const c = (o) => Object.keys(o).reduce((n, k) => n + (o[k] && typeof o[k] === "object" ? c(o[k]) : 1), 0);
  console.log(`${file}: Tools=[${Object.keys(json.Tools).join(",")}] leaves ${c(json)}`);
}
