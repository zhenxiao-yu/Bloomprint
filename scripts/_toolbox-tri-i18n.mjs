import { readFileSync, writeFileSync } from "node:fs";

const COMMON = {
  en: { shapeTriangle: "Triangle", base: "Base", height: "Height" },
  zh: { shapeTriangle: "三角形", base: "底边", height: "高" },
};

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  Object.assign(json.Toolbox.common, COMMON[locale]);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  const c = (o) => Object.keys(o).reduce((n, k) => n + (o[k] && typeof o[k] === "object" ? c(o[k]) : 1), 0);
  console.log(`${file}: leaves ${c(json)}`);
}
