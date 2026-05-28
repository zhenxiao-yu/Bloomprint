import { readFileSync, writeFileSync } from "node:fs";

const T = {
  en: {
    title: "Seed-Starting Schedule",
    intro: "From your last spring frost date, when to start each crop indoors, transplant, or sow direct.",
    frostMonth: "Last frost — month",
    frostDay: "Day",
    frostHint: "Not sure? Look up your last spring frost date (Old Farmer's Almanac) by ZIP or postal code.",
    colCrop: "Crop",
    indoorSow: "Start indoors",
    transplant: "Transplant",
    directSow: "Direct sow",
    crop_tomato: "Tomato",
    crop_pepper: "Pepper",
    crop_lettuce: "Lettuce",
    crop_cucumber: "Cucumber",
    crop_squash: "Squash",
    crop_beans: "Beans",
    crop_peas: "Peas",
    crop_broccoli: "Broccoli",
    crop_kale: "Kale",
    crop_basil: "Basil",
    crop_carrots: "Carrots",
    crop_onion: "Onion",
    formula: "date = last frost ± crop's weeks-from-frost",
    how: "Each crop has a known number of weeks it should be started before or after your last spring frost. We offset your frost date accordingly for indoor sowing, transplanting out, and direct sowing.",
    evidence: [
      "Weeks-from-frost are standard seed-packet/extension guidelines.",
      "Frost date is the universal anchor — it works anywhere in the US and Canada.",
      "Adjust for your microclimate and always check the seed packet.",
    ],
    emptyTitle: "Enter your frost date",
    emptyBody: "Pick the month and day of your last spring frost.",
  },
  zh: {
    title: "育苗时间表",
    intro: "根据你的春季最后一次霜冻日期，算出每种作物何时室内播种、移栽或直播。",
    frostMonth: "最后霜冻——月份",
    frostDay: "日",
    frostHint: "不确定？可按邮编查你所在地的春季最后霜冻日期（如 Old Farmer's Almanac）。",
    colCrop: "作物",
    indoorSow: "室内播种",
    transplant: "移栽",
    directSow: "直播",
    crop_tomato: "番茄",
    crop_pepper: "辣椒",
    crop_lettuce: "生菜",
    crop_cucumber: "黄瓜",
    crop_squash: "南瓜",
    crop_beans: "豆类",
    crop_peas: "豌豆",
    crop_broccoli: "西兰花",
    crop_kale: "羽衣甘蓝",
    crop_basil: "罗勒",
    crop_carrots: "胡萝卜",
    crop_onion: "洋葱",
    formula: "日期 = 最后霜冻 ± 作物相对霜冻的周数",
    how: "每种作物都有一个相对春季最后霜冻该提前或推迟播种的周数。我们据此从你的霜冻日期偏移，得到室内播种、移栽和直播的日期。",
    evidence: [
      "相对霜冻的周数为种子包装/推广机构的通用指南。",
      "霜冻日期是通用锚点——在美国和加拿大各地都适用。",
      "请按你的小气候调整，并始终参考种子包装。",
    ],
    emptyTitle: "输入你的霜冻日期",
    emptyBody: "选择春季最后一次霜冻的月份和日期。",
  },
};

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  json.Tools.seedStarting = T[locale];
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: Tools count ${Object.keys(json.Tools).length}`);
}
