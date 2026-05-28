// Temporary one-shot: merge the _zh/batch*.json localization parts into zh.json,
// add the new SettingsModal namespace to both locales, and verify key parity.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const root = new URL("../messages/", import.meta.url);
const enPath = new URL("en.json", root);
const zhPath = new URL("zh.json", root);
const partsDir = new URL("_zh/", root);

const en = JSON.parse(readFileSync(enPath, "utf8"));
const zh = JSON.parse(readFileSync(zhPath, "utf8"));

// 1) Merge translated parts into zh (top-level namespace replacement).
let mergedNs = [];
for (const file of readdirSync(partsDir).filter((f) => f.endsWith(".json"))) {
  const part = JSON.parse(readFileSync(new URL(file, partsDir), "utf8"));
  for (const ns of Object.keys(part)) {
    zh[ns] = part[ns];
    mergedNs.push(ns);
  }
}

// 2) New SettingsModal namespace (en + zh).
const enSettingsModal = {
  open: "Settings",
  title: "Settings",
  subtitle: "Personalize Bloomprint on this device.",
  section_appearance: "Appearance",
  section_language: "Language",
  section_units: "Units & region",
  section_notifications: "Notifications",
  section_privacy: "Data & privacy",
  fontSize: "Text size",
  font_compact: "Compact",
  font_default: "Default",
  font_comfortable: "Comfortable",
  font_large: "Large",
  fontPreview: "The quick brown fox jumps over a tidy garden bed.",
  reduceMotion: "Reduce motion",
  reduceMotionBody: "Minimize animations and transitions across the app.",
  highContrast: "High contrast",
  highContrastBody: "Stronger borders and text for easier reading.",
  largeTapTargets: "Larger tap targets",
  largeTapTargetsBody: "Bigger buttons and inputs for easier tapping.",
  languageBody: "Switch the interface language. Plant facts stay sourced and accurate.",
  units: "Measurement units",
  unitsBody: "Used for areas, spacing, and the toolbox calculators.",
  imperial: "Imperial",
  metric: "Metric",
  currency: "Currency",
  currencyBody: "Shown on price ranges — always verify before buying.",
  consentTitle: "Privacy & cookies",
  consentBody:
    "Choose what Bloomprint may collect. Essential keeps only what the app needs to work.",
  consentAll: "Allow all",
  consentEssential: "Essential only",
  analytics: "Product analytics",
  analyticsBody: "Anonymous usage insights that help improve Bloomprint.",
  exportData: "Export my data",
  exportDataBody: "Download everything stored on this device as JSON.",
  storageUsed: "{kb} KB used",
  clearData: "Clear all local data",
  clearDataBody: "Removes saved plans, drafts, and preferences from this device.",
  clearConfirm: "Tap again to permanently delete",
  resetAll: "Reset settings to defaults",
  savedHint: "Settings are saved on this device only.",
};

const zhSettingsModal = {
  open: "设置",
  title: "设置",
  subtitle: "在这台设备上个性化 Bloomprint。",
  section_appearance: "外观",
  section_language: "语言",
  section_units: "单位与地区",
  section_notifications: "通知",
  section_privacy: "数据与隐私",
  fontSize: "字号",
  font_compact: "紧凑",
  font_default: "默认",
  font_comfortable: "舒适",
  font_large: "大",
  fontPreview: "种下第一株植物，庭院就开始变样了。",
  reduceMotion: "减少动效",
  reduceMotionBody: "尽量关闭全站的动画与过渡效果。",
  highContrast: "高对比度",
  highContrastBody: "加强边框与文字，让内容更易读。",
  largeTapTargets: "更大的点按区域",
  largeTapTargetsBody: "放大按钮和输入框，点起来更轻松。",
  languageBody: "切换界面语言。植物信息始终有据可查、准确无误。",
  units: "计量单位",
  unitsBody: "用于面积、间距和工具箱里的各项计算。",
  imperial: "英制",
  metric: "公制",
  currency: "货币",
  currencyBody: "用于显示价格区间——下单前请务必再核对。",
  consentTitle: "隐私与 Cookie",
  consentBody: "选择 Bloomprint 可以收集哪些信息。“仅必要”只保留应用运行所必需的部分。",
  consentAll: "全部允许",
  consentEssential: "仅必要",
  analytics: "产品分析",
  analyticsBody: "匿名的使用情况，帮助我们把 Bloomprint 做得更好。",
  exportData: "导出我的数据",
  exportDataBody: "把这台设备上保存的全部内容导出为 JSON。",
  storageUsed: "已用 {kb} KB",
  clearData: "清除全部本地数据",
  clearDataBody: "从这台设备移除已保存的方案、草稿和偏好设置。",
  clearConfirm: "再点一次以永久删除",
  resetAll: "恢复默认设置",
  savedHint: "设置仅保存在这台设备上。",
};

en.SettingsModal = enSettingsModal;
zh.SettingsModal = zhSettingsModal;

writeFileSync(enPath, JSON.stringify(en, null, 2) + "\n", "utf8");
writeFileSync(zhPath, JSON.stringify(zh, null, 2) + "\n", "utf8");

// 3) Parity check (flattened key sets).
function flatten(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}
const enKeys = flatten(en);
const zhKeys = flatten(zh);
const missingInZh = [...enKeys].filter((k) => !zhKeys.has(k));
const extraInZh = [...zhKeys].filter((k) => !enKeys.has(k));

console.log(`merged namespaces: ${[...new Set(mergedNs)].sort().join(", ")}`);
console.log(`en keys: ${enKeys.size} | zh keys: ${zhKeys.size}`);
console.log(`missing in zh (${missingInZh.length}):`, missingInZh.slice(0, 40));
console.log(`extra in zh (${extraInZh.length}):`, extraInZh.slice(0, 40));
