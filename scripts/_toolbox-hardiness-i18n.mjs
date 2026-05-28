import { readFileSync, writeFileSync } from "node:fs";

const T = {
  en: {
    title: "Hardiness Zone Finder",
    intro: "Look up your USDA plant hardiness zone by ZIP — the number every plant tag (and our Plant Finder) uses.",
    zipLabel: "US ZIP code",
    zipPlaceholder: "e.g. 20001",
    find: "Find my zone",
    loading: "Looking up…",
    zoneLabel: "Your hardiness zone",
    tempRange: "Average coldest winter lows: {low}°F to {high}°F",
    errInvalid: "Enter a 5-digit US ZIP code.",
    errNotFound: "No zone found for that ZIP — check the digits, or use the USDA map.",
    errUnreachable: "Couldn't reach the zone service. Try again, or enter your zone manually.",
    verify: "Live from the USDA map — confirm before relying on it for borderline plants.",
    usePlantFinder: "Use this zone in the Plant Finder to see what thrives.",
    formula: "ZIP → USDA 2023 hardiness zone (coldest-winter-low band)",
    how: "We look up your ZIP against the USDA 2023 Plant Hardiness Zone Map (via phzmapi.org). Your zone is the band of average coldest winter temperatures; plants are rated for the coldest zone they survive.",
    evidence: [
      "Source: USDA 2023 Plant Hardiness Zone Map, via phzmapi.org (keyless).",
      "Zones are 10°F bands; the 'a'/'b' suffix splits each in half.",
      "Microclimates vary — a sheltered city yard can run a half-zone warmer.",
    ],
    emptyTitle: "Enter your ZIP",
    emptyBody: "We'll look up your USDA hardiness zone.",
  },
  zh: {
    title: "耐寒区查询",
    intro: "按邮编查询你的 USDA 植物耐寒区——每张植物标签（以及我们的“选植物”工具）都用到的那个数字。",
    zipLabel: "美国邮编",
    zipPlaceholder: "例如 20001",
    find: "查询我的耐寒区",
    loading: "查询中……",
    zoneLabel: "你的耐寒区",
    tempRange: "冬季平均最低气温约：{low}°F 到 {high}°F",
    errInvalid: "请输入 5 位美国邮编。",
    errNotFound: "未找到该邮编对应的耐寒区——请检查数字，或查看 USDA 地图。",
    errUnreachable: "无法连接耐寒区服务。请重试，或手动填写你的耐寒区。",
    verify: "数据实时来自 USDA 地图——临界植物请先确认再依赖。",
    usePlantFinder: "把这个耐寒区填进“选植物”工具，看看哪些能长得好。",
    formula: "邮编 → USDA 2023 耐寒区（冬季最低温区间）",
    how: "我们用你的邮编对照 USDA 2023 植物耐寒区地图（通过 phzmapi.org）。耐寒区代表冬季平均最低气温的区间；植物会标注其能存活的最冷耐寒区。",
    evidence: [
      "来源：USDA 2023 植物耐寒区地图，经 phzmapi.org（免密钥）。",
      "每个耐寒区为 10°F 区间；后缀 a/b 再把它平分。",
      "小气候有差异——背风的城市庭院可能暖半个区。",
    ],
    emptyTitle: "输入邮编",
    emptyBody: "我们会查出你的 USDA 耐寒区。",
  },
};

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.Tools.hardiness = T[locale];
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: Tools=[${Object.keys(json.Tools).join(",")}]`);
}
