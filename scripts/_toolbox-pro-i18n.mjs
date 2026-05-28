import { readFileSync, writeFileSync } from "node:fs";

const T = {
  en: {
    jobQuote: {
      title: "Job Estimator (Pro)",
      intro: "Turn an area + service into labor hours, a material cost band, and a quote range with your margin.",
      areaLabel: "Area",
      service: "Service",
      service_plantingBed: "Planting bed",
      service_sod: "Sod install",
      service_mulch: "Mulch",
      service_paverPatio: "Paver patio",
      service_lawnSeed: "Lawn seeding",
      service_cleanup: "Cleanup",
      crewRate: "Crew rate (/hr)",
      margin: "Margin (%)",
      priceTitle: "Estimated price",
      hoursLabel: "Labor hours",
      laborLabel: "Labor cost",
      materialLabel: "Materials",
      perSqftLabel: "Per sq ft",
      disclaimer: "Planning estimate, not a quote — confirm local material prices and your own production rates.",
      formula: "price = (labor + materials) × (1 + margin)   ·   labor = rate × area ÷ 100 × 1.15",
      how: "We apply an industry production rate (crew-hours per 100 sq ft) for the service, add a 15% setup/cleanup buffer, band the materials by typical $/sq ft, then add your margin. Everything is a range, not a fixed price.",
      evidence: [
        "Production rates and material $/sq ft are typical industry planning figures — tune them to your crew and market.",
        "The 15% buffer covers mobilization, breaks, and cleanup.",
        "This is an internal estimate; a real quote needs a site visit.",
      ],
      emptyTitle: "Enter the job area",
      emptyBody: "Add the area and pick a service.",
    },
  },
  zh: {
    jobQuote: {
      title: "工程估价（专业版）",
      intro: "把面积 + 服务项目，换算成工时、材料成本区间，以及含利润的报价区间。",
      areaLabel: "面积",
      service: "服务项目",
      service_plantingBed: "种植床",
      service_sod: "草皮铺装",
      service_mulch: "覆盖物",
      service_paverPatio: "铺砖露台",
      service_lawnSeed: "草坪播种",
      service_cleanup: "清理",
      crewRate: "班组工时费（/小时）",
      margin: "利润（%）",
      priceTitle: "估算报价",
      hoursLabel: "工时",
      laborLabel: "人工成本",
      materialLabel: "材料",
      perSqftLabel: "每平方英尺",
      disclaimer: "为规划用估算，并非正式报价——请核实本地材料价格和你自己的施工效率。",
      formula: "报价 =（人工 + 材料）×（1 + 利润）   ·   人工 = 效率 × 面积 ÷ 100 × 1.15",
      how: "我们按该服务的行业施工效率（每 100 平方英尺的班组工时）计算，加 15% 的准备/清理余量，按典型每平方英尺材料价定区间，再加上你的利润。所有结果都是区间，而非固定价。",
      evidence: [
        "施工效率和每平方英尺材料价为典型行业规划数据——请按你的班组和市场调整。",
        "15% 余量用于进场、休息和清理。",
        "这是内部估算；正式报价需要现场勘查。",
      ],
      emptyTitle: "输入工程面积",
      emptyBody: "填入面积并选择服务项目。",
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
