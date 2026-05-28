/** P1: add shared Toolbox.common keys + Tools.<slug> for soil/compost/gravel/edging/bedArea. */
import { readFileSync, writeFileSync } from "node:fs";

const PATCH = {
  en: {
    Toolbox: {
      common: {
        extra: "Extra buffer",
        bagSize: "Bag size",
        bagSizeValue: "{size} cu ft",
        bags: "bags",
        recommendedBags: "Recommended: {count} bags (with buffer)",
        volumeYd: "Bulk volume",
        cuYd: "cu yd",
        tons: "Est. bulk weight",
        tonsValue: "{low}–{high} tons",
        assumeBag: "One bag = {size} cu ft.",
        assumeDepth: "Depth: {depth} in across the whole area.",
        assumeBuffer: "Includes a {pct}% buffer for settling and waste.",
        pieces: "pieces",
        recommendedPieces: "Recommended: {count} pieces (with buffer)",
        pieceLength: "Piece length",
        assumePiece: "Each piece is {len} ft long.",
        perimeter: "Perimeter",
      },
    },
    Tools: {
      soil: {
        title: "Topsoil Calculator",
        intro: "How much topsoil or garden soil to fill a bed, by bag or cubic yard.",
        emptyTitle: "Enter your bed size",
        emptyBody: "Fill in the area and depth to see how much soil to buy.",
      },
      compost: {
        title: "Compost Calculator",
        intro: "How much compost to top-dress or amend a bed.",
        emptyTitle: "Enter your bed size",
        emptyBody: "Fill in the area and depth to see how much compost to buy.",
      },
      gravel: {
        title: "Gravel & Stone Calculator",
        intro: "How much gravel or crushed stone to cover an area — by bag, cubic yard, or estimated tons.",
        emptyTitle: "Enter your area",
        emptyBody: "Fill in the area and depth to see how much stone to buy.",
      },
      edging: {
        title: "Edging Calculator",
        intro: "How many edging pieces to border a bed.",
        emptyTitle: "Enter your bed shape",
        emptyBody: "Pick a rectangle or circle and enter its size to see how much edging you need.",
      },
      bedArea: {
        title: "Bed Area Calculator",
        intro: "Measure a bed's area and perimeter — the starting point for every material estimate.",
        emptyTitle: "Enter your dimensions",
        emptyBody: "Fill in the shape to see area and perimeter.",
      },
    },
  },
  zh: {
    Toolbox: {
      common: {
        extra: "额外余量",
        bagSize: "每袋容量",
        bagSizeValue: "{size} 立方英尺",
        bags: "袋",
        recommendedBags: "建议：{count} 袋（含余量）",
        volumeYd: "散装体积",
        cuYd: "立方码",
        tons: "估算散装重量",
        tonsValue: "{low}–{high} 吨",
        assumeBag: "每袋 = {size} 立方英尺。",
        assumeDepth: "厚度：整块区域均按 {depth} 英寸计算。",
        assumeBuffer: "含 {pct}% 余量，用于沉降和损耗。",
        pieces: "段",
        recommendedPieces: "建议：{count} 段（含余量）",
        pieceLength: "每段长度",
        assumePiece: "每段长 {len} 英尺。",
        perimeter: "周长",
      },
    },
    Tools: {
      soil: {
        title: "土壤计算器",
        intro: "按袋或立方码，算出填满一处花床需要多少表层土或园艺土。",
        emptyTitle: "输入花床尺寸",
        emptyBody: "填好面积和厚度，就能看到需要购买多少土。",
      },
      compost: {
        title: "堆肥计算器",
        intro: "为花床覆面或改良土壤需要多少堆肥。",
        emptyTitle: "输入花床尺寸",
        emptyBody: "填好面积和厚度，就能看到需要购买多少堆肥。",
      },
      gravel: {
        title: "砾石与碎石计算器",
        intro: "覆盖一片区域需要多少砾石或碎石——按袋、按立方码或估算吨数。",
        emptyTitle: "输入区域面积",
        emptyBody: "填好面积和厚度，就能看到需要购买多少碎石。",
      },
      edging: {
        title: "收边计算器",
        intro: "为花床收边需要多少段材料。",
        emptyTitle: "选择花床形状",
        emptyBody: "选择矩形或圆形并输入尺寸，即可看到需要多少收边材料。",
      },
      bedArea: {
        title: "花床面积计算器",
        intro: "测量花床的面积和周长——每个材料估算的起点。",
        emptyTitle: "输入尺寸",
        emptyBody: "填好形状即可看到面积和周长。",
      },
    },
  },
};

function deepMerge(dst, src) {
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
      dst[k] = dst[k] && typeof dst[k] === "object" ? dst[k] : {};
      deepMerge(dst[k], src[k]);
    } else {
      dst[k] = src[k];
    }
  }
}

for (const [file, locale] of [
  ["messages/en.json", "en"],
  ["messages/zh.json", "zh"],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  deepMerge(json, PATCH[locale]);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  const c = (o) => Object.keys(o).reduce((n, k) => n + (o[k] && typeof o[k] === "object" ? c(o[k]) : 1), 0);
  console.log(`${file}: leaves ${c(json)}`);
}
