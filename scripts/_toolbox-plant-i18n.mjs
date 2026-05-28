import { readFileSync, writeFileSync } from "node:fs";

const CROPS = {
  en: { tomato: "Tomato", basil: "Basil", pepper: "Pepper", carrot: "Carrot", onion: "Onion", lettuce: "Lettuce", beans: "Beans", peas: "Peas", cucumber: "Cucumber", squash: "Squash", corn: "Corn", broccoli: "Broccoli", potato: "Potato", strawberry: "Strawberry", garlic: "Garlic", marigold: "Marigold", dill: "Dill" },
  zh: { tomato: "番茄", basil: "罗勒", pepper: "辣椒", carrot: "胡萝卜", onion: "洋葱", lettuce: "生菜", beans: "豆类", peas: "豌豆", cucumber: "黄瓜", squash: "南瓜", corn: "玉米", broccoli: "西兰花", potato: "土豆", strawberry: "草莓", garlic: "大蒜", marigold: "万寿菊", dill: "莳萝" },
};
const NOTES = {
  en: {
    tomato: "Basil and marigold deter pests; keep brassicas, corn, and potato apart (disease + competition).",
    basil: "A classic partner for tomatoes and peppers — may improve flavor and repel insects.",
    pepper: "Likes basil and alliums; beans and brassicas compete or shade it.",
    carrot: "Pairs with alliums (confuse carrot fly); dill can cross and stunt them.",
    onion: "Alliums protect many crops but stunt legumes (beans, peas).",
    lettuce: "Easygoing filler between slower crops; light feeder.",
    beans: "Fix nitrogen for heavy feeders like corn; alliums inhibit them.",
    peas: "Nitrogen-fixers; keep away from onions and garlic.",
    cucumber: "Loves the 'three sisters' partners; potatoes can spread blight.",
    squash: "Shades soil in a three-sisters bed; keep from potatoes.",
    corn: "Supports beans and shades squash; tomatoes share pests (hornworm).",
    broccoli: "Alliums and lettuce help; tomatoes, beans, and strawberries clash.",
    potato: "Beans and corn help; nightshade relatives (tomato) share blight.",
    strawberry: "Lettuce and beans are friendly; brassicas compete heavily.",
    garlic: "Repels many pests near tomatoes/carrots; stunts legumes.",
    marigold: "A pest-deterring companion for most beds.",
  },
  zh: {
    tomato: "罗勒和万寿菊驱虫；远离十字花科、玉米和土豆（病害与竞争）。",
    basil: "番茄和辣椒的经典搭档——或可改善风味并驱虫。",
    pepper: "喜欢罗勒和葱蒜；豆类和十字花科会竞争或遮荫。",
    carrot: "与葱蒜相配（干扰胡萝卜蝇）；莳萝会杂交并使其矮化。",
    onion: "葱蒜保护多种作物，但会抑制豆科（豆类、豌豆）。",
    lettuce: "在慢长作物间见缝插针；需肥少。",
    beans: "为玉米等需肥作物固氮；葱蒜会抑制它们。",
    peas: "固氮作物；远离洋葱和大蒜。",
    cucumber: "喜欢“三姐妹”搭档；土豆易传播疫病。",
    squash: "在三姐妹床里遮蔽土壤；远离土豆。",
    corn: "支撑豆类并为南瓜遮荫；番茄共享害虫（天蛾）。",
    broccoli: "葱蒜和生菜有益；番茄、豆类和草莓相克。",
    potato: "豆类和玉米有益；茄科亲戚（番茄）共享疫病。",
    strawberry: "生菜和豆类友好；十字花科竞争激烈。",
    garlic: "在番茄/胡萝卜旁驱虫；会抑制豆科。",
    marigold: "适合多数花床的驱虫伴生植物。",
  },
};
const GRASS = {
  en: { tallFescue: "Tall fescue", kentuckyBluegrass: "Kentucky bluegrass", perennialRye: "Perennial ryegrass", fineFescue: "Fine fescue", bermuda: "Bermudagrass", zoysia: "Zoysia", stAugustine: "St. Augustine", centipede: "Centipede" },
  zh: { tallFescue: "高羊茅", kentuckyBluegrass: "草地早熟禾", perennialRye: "多年生黑麦草", fineFescue: "细羊茅", bermuda: "狗牙根", zoysia: "结缕草", stAugustine: "圣奥古斯丁草", centipede: "假俭草" },
};

const T = {
  en: {
    companion: {
      title: "Companion Planting",
      intro: "Pick a crop and see what to plant beside it — and what to keep apart — and why.",
      cropLabel: "Crop",
      goodTitle: "Plant near",
      badTitle: "Keep apart",
      noteTitle: "Why",
      formula: "crop → curated good / bad neighbors",
      how: "We look your crop up in a curated companion table — partners that help (pest control, nitrogen, shade) and antagonists that compete or share pests.",
      evidence: [
        "Traditional companion-planting guidance, widely cited but not lab-proven.",
        "Effects vary by garden, variety, and spacing.",
        "Helpers like marigold and basil pair broadly across beds.",
      ],
      emptyTitle: "Pick a crop",
      emptyBody: "Choose a crop to see its companions.",
    },
    grassType: {
      title: "Grass-Type Selector",
      intro: "Find turf species that fit your climate, sun, and foot traffic — cool-season North to warm-season South.",
      region: "Climate region",
      region_cool: "Cool-season (North)",
      region_transition: "Transition zone",
      region_warm: "Warm-season (South)",
      sun: "Sun",
      sun_full: "Full sun",
      sun_part: "Part shade",
      sun_shade: "Shade",
      traffic: "Foot traffic",
      traffic_low: "Low",
      traffic_medium: "Medium",
      traffic_high: "High",
      lowWater: "Prioritize low water",
      sunOk: "Handles your light",
      trafficOk: "Takes the traffic",
      lowWaterTrait: "Low water",
      bestPick: "Best pick",
      noMatches: "No grass fits those conditions — try part shade or the transition zone.",
      formula: "filter by season + sun, rank by traffic + water fit",
      how: "We match species to your region's season and the sun they tolerate, then rank by how well they take your foot traffic and (if prioritized) low water.",
      evidence: [
        "Most of Canada and the northern US are cool-season; the deep South is warm-season.",
        "Tall fescue is the most adaptable cool-season all-rounder; bermuda/zoysia handle heat + traffic.",
        "Confirm cultivars and seed/sod availability locally.",
      ],
      emptyTitle: "Set your conditions",
      emptyBody: "Pick region, sun, and traffic.",
    },
  },
  zh: {
    companion: {
      title: "伴生种植",
      intro: "选一种作物，看看旁边该种什么、该避开什么，以及原因。",
      cropLabel: "作物",
      goodTitle: "宜邻种",
      badTitle: "宜远离",
      noteTitle: "原因",
      formula: "作物 → 精选的宜邻 / 相克",
      how: "我们在精选的伴生表中查你的作物——有益的搭档（驱虫、固氮、遮荫）与会竞争或共享害虫的相克作物。",
      evidence: [
        "传统伴生种植经验，广为引用但未必有实验证实。",
        "效果因花园、品种和间距而异。",
        "万寿菊、罗勒等助手适合多数花床。",
      ],
      emptyTitle: "选择作物",
      emptyBody: "选一种作物来查看它的伴生植物。",
    },
    grassType: {
      title: "草种选择器",
      intro: "按气候、光照和踩踏强度，找到适合的草坪草种——从北方冷季型到南方暖季型。",
      region: "气候区",
      region_cool: "冷季型（北方）",
      region_transition: "过渡带",
      region_warm: "暖季型（南方）",
      sun: "光照",
      sun_full: "全日照",
      sun_part: "半遮荫",
      sun_shade: "遮荫",
      traffic: "踩踏强度",
      traffic_low: "低",
      traffic_medium: "中",
      traffic_high: "高",
      lowWater: "优先省水",
      sunOk: "适应你的光照",
      trafficOk: "耐踩踏",
      lowWaterTrait: "省水",
      bestPick: "最佳选择",
      noMatches: "没有符合这些条件的草种——试试半遮荫或过渡带。",
      formula: "按季型 + 光照筛选，再按踩踏 + 省水排序",
      how: "我们按你所在区域的季型和草种能耐受的光照来匹配，再按其耐踩踏程度以及（若优先）省水程度排序。",
      evidence: [
        "加拿大大部分和美国北部为冷季型；美国深南部为暖季型。",
        "高羊茅是适应性最强的冷季型全能草；狗牙根/结缕草耐热又耐踩。",
        "请在本地确认品种及种子/草皮供应。",
      ],
      emptyTitle: "设置你的条件",
      emptyBody: "选择气候区、光照和踩踏强度。",
    },
  },
};

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const comp = { ...T[locale].companion };
  for (const [k, v] of Object.entries(CROPS[locale])) comp[`crop_${k}`] = v;
  for (const [k, v] of Object.entries(NOTES[locale])) comp[`note_${k}`] = v;
  json.Tools.companion = comp;
  const grass = { ...T[locale].grassType };
  for (const [k, v] of Object.entries(GRASS[locale])) grass[`grass_${k}`] = v;
  json.Tools.grassType = grass;
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: Tools count ${Object.keys(json.Tools).length}`);
}
