/** Commit B: add Tools.spacing + Tools.watering (en+zh). */
import { readFileSync, writeFileSync } from "node:fs";

const T = {
  en: {
    spacing: {
      title: "Plant Spacing Calculator",
      intro: "How many plants fill a bed at a given spacing — square or triangular layout.",
      emptyTitle: "Enter area and spacing",
      emptyBody: "Fill in the bed size and how far apart the plants go.",
      spacingLabel: "Spacing (center to center)",
      pattern: "Layout",
      patternSquare: "Square grid",
      patternTriangular: "Triangular (offset rows)",
      plants: "plants",
      perPlant: "Area per plant",
      formula: "square: plants = area ÷ spacing²   ·   triangular: ~15% more",
      how: "Each plant needs a spacing × spacing square of room. Triangular (offset) rows pack about 15% more plants into the same area. Counts round down so you never over-buy.",
      evidence: [
        "Spacing is center-to-center — from the plant tag or our plant library.",
        "Triangular layout uses ~0.866× the area per plant.",
        "Counts round down to whole plants.",
      ],
    },
    watering: {
      title: "Watering Run-Time Calculator",
      intro: "How long to run a sprinkler to apply a target amount of water.",
      emptyTitle: "Enter your sprinkler rate",
      emptyBody: "Enter how fast your sprinkler applies water (inches per hour).",
      outputRate: "Sprinkler rate (in/hr)",
      targetDepth: "Target water (in)",
      minutes: "minutes",
      formula: "minutes = target depth ÷ output rate × 60",
      how: "Find your sprinkler's output rate with a catch-cup test — place cups, run 15 min, measure the average depth. Divide your target by that rate to get the run time.",
      evidence: [
        "Lawns usually want about 1 inch of water per session.",
        "Output rate comes from a catch-cup test or the sprinkler's spec sheet.",
        "On slopes or clay, split into shorter cycles to avoid runoff.",
      ],
    },
  },
  zh: {
    spacing: {
      title: "植物间距计算器",
      intro: "按给定间距，一处花床能种多少株——方形或三角形排布。",
      emptyTitle: "输入面积和间距",
      emptyBody: "填好花床尺寸以及植株之间的间距。",
      spacingLabel: "间距（中心到中心）",
      pattern: "排布方式",
      patternSquare: "方形网格",
      patternTriangular: "三角形（错行）",
      plants: "株",
      perPlant: "每株占用面积",
      formula: "方形：株数 = 面积 ÷ 间距²   ·   三角形：约多 15%",
      how: "每株需要一块 间距 × 间距 的方形空间。三角形（错行）排布在同样面积里能多种约 15%。株数向下取整，避免多买。",
      evidence: [
        "间距按中心到中心计算——取自植物标签或我们的植物库。",
        "三角形排布每株约占 0.866 倍面积。",
        "株数向下取整到整株。",
      ],
    },
    watering: {
      title: "浇水时长计算器",
      intro: "为达到目标水量，喷头需要运行多久。",
      emptyTitle: "输入喷头出水速率",
      emptyBody: "输入喷头的出水速率（英寸/小时）。",
      outputRate: "喷头速率（英寸/小时）",
      targetDepth: "目标水深（英寸）",
      minutes: "分钟",
      formula: "分钟 = 目标水深 ÷ 出水速率 × 60",
      how: "用接水杯测试测出喷头速率——放几个杯子、运行 15 分钟、量平均水深。用目标水深除以该速率即得运行时长。",
      evidence: [
        "草坪通常每次需要约 1 英寸水。",
        "出水速率来自接水杯测试或喷头规格表。",
        "在坡地或黏土上，分成几个短周期以免径流。",
      ],
    },
  },
};

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  for (const [slug, block] of Object.entries(T[locale])) json.Tools[slug] = block;
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: Tools=[${Object.keys(json.Tools).join(",")}]`);
}
