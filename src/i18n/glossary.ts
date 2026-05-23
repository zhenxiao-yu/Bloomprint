/**
 * Central EN→ZH domain glossary for Bloomprint.
 *
 * Tone: natural, trustworthy Simplified Chinese — NOT literal/machine translation.
 * Use "院子" in conversational UI; reserve "庭院" for branding/titles.
 *
 * This is the single source of truth for landscaping terms so translations stay
 * consistent across messages/*.json and any inline copy.
 */
export const glossary = {
  "curb appeal": "门面美观",
  privacy: "隐私遮挡",
  "low maintenance": "低维护",
  yard: "院子",
  "front yard": "前院",
  backyard: "后院",
  "side yard": "侧院",
  "foundation bed": "房屋边缘花坛",
  mulch: "覆盖物 / 木屑",
  "decorative stone": "装饰石",
  edging: "花坛边界条",
  "hardiness zone": "耐寒区",
  "salt exposure": "融雪盐影响",
  drainage: "排水",
  "full sun": "全日照",
  "part sun": "半日照",
  shade: "阴面 / 少日照",
  "install phases": "施工步骤",
  "store reality check": "门店购买检查",
  "needs local verification": "需要本地确认",
} as const;

export type GlossaryTerm = keyof typeof glossary;
