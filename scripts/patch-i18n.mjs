/** One-shot: deep-merge new redesign i18n keys into en.json + zh.json (never overwrites existing). */
import { readFileSync, writeFileSync } from "node:fs";

const EN = {
  Theme: { appearance: "Appearance" },
  Nav: { more: "More", moreDescription: "More navigation options" },
  Home: {
    heroKicker: "Buildable, not just beautiful.",
    stats: {
      heading: "What every plan includes",
      deliverables: "Plan sections: shopping list, install order, risks, store",
      steps: "Install steps, in the right order",
      accounts: "Accounts or keys required to start",
    },
    bento: {
      eyebrow: "Every plan, end to end",
      title: "A buildable plan, not a render",
      subtitle:
        "Materials, order, risks, and store reality — worked out before you spend a dollar.",
      photoCaption: "Sized to your real yard",
      shoppingBody: "Plants, materials, and quantities from the Core Library — never invented by AI.",
      orderBody: "The exact sequence to build in, so nothing gets redone.",
      risksBody: "What can go wrong, flagged early with the evidence behind it.",
      storeBody: "Search links and substitutions — no fake inventory claims.",
    },
    marquee: { label: "Real yards, real transformations" },
    capture: { badge: "Plan from a photo" },
    entry: { heading: "Pick how you want to start", recommended: "Recommended", go: "Get started" },
  },
  Dashboard: {
    title: "Welcome back to your yard workspace.",
    subtitle:
      "Continue drafts, compare versions, manage photos, or switch into pro and store workflows.",
    eyebrow: "Command center",
    heroAlt: "A home exterior framed by a green lawn and trees",
    ctaNew: "New project",
    ctaPro: "Pro dashboard",
    statsAria: "Workspace metrics",
    statActive: "Active plans",
    statActiveHint: "Plans you've saved and can reopen or compare.",
    statPhotos: "Draft photos",
    statPhotosHint: "Photos in your current planning draft.",
    statCompare: "Ready to compare",
    statCompareHint: "Save two or more plans to compare them side by side.",
    statMode: "Workspace mode",
    statModeHint: "Switches to Pro when your draft is for a client property.",
    modeHome: "Home",
    modePro: "Pro",
    resumeTitle: "Resume your latest planning session",
    resumeMeta: "{photos} photo(s), {zones} detected zone(s), last saved {when}.",
    resumeCta: "Resume draft",
    recentTitle: "Recent projects",
    recentOpenAll: "Open saved",
    recentEmptyTitle: "No saved projects yet",
    recentEmptyBody: "Start with photos and Bloomprint will keep a draft for you.",
    recentEmptyCta: "Start a plan",
    draftDefault: "Draft 1",
    confidenceSuffix: "{confidence} confidence",
    modesTitle: "Modes",
    modesSubtitle: "Pick the flow that fits today's job.",
    modeHomeownerTitle: "Homeowner",
    modeHomeownerBody: "Fix your own yard, save versions, continue later.",
    modeProTitle: "Landscaper / Pro",
    modeProBody: "Clients, properties, quote-ready material and labor views.",
    modeStoreTitle: "Store helper",
    modeStoreBody: "Operational recommendations, substitutions, and print/share summary.",
  },
  SavedPlans: {
    emptyBadge: "Your plan library",
    emptyPhotoAlt: "A freshly built raised garden bed",
    rowActionsAria: "Plan actions",
    addToCompare: "Add to compare",
    removeFromCompare: "Remove from compare",
    copyLink: "Copy link",
    pageAria: "Page {page}",
    renameHint: "Give this plan a name you'll recognize later.",
    renameLabel: "Plan name",
    renameCancel: "Cancel",
    renameSave: "Save name",
    toastRenamed: 'Renamed to "{label}"',
    toastDeleted: 'Deleted "{label}"',
    toastLinkCopied: "Plan link copied",
    toastLinkError: "Couldn't copy the link",
  },
  Pro: {
    emptyPhotoAlt: "A landscaped garden path",
    onboard1Title: "Add a job",
    onboard1Body: "Capture a client project from lead to done.",
    onboard2Title: "Link a plan",
    onboard2Body: "Attach a buildable Bloomprint plan to each job.",
    onboard3Title: "Buy in one list",
    onboard3Body: "Merge materials across jobs into one buy list.",
    statActiveHint: "Jobs that aren't done yet.",
    statAwaitingHint: "Quoted jobs waiting on client approval.",
    statScheduledHint: "Jobs installing within the next week.",
    statPipelineHint: "Total quoted value across open jobs.",
    toastSampleLoaded: "Sample workspace loaded",
    toastWorkspaceCleared: "Workspace cleared",
    toastClientAdded: "Added {name}",
    toastBuyCopied: "Buy list copied",
    toastBuyCopyError: "Couldn't copy the list",
  },
  Account: {
    noAccountBadge: "Get started",
    noAccountPhotoAlt: "Young seedlings ready to grow",
    tabOverview: "Overview",
    tabData: "Data & sync",
    savedPlansHint: "Plans saved on this device — open or compare any time.",
    startNewBody: "Turn a fresh idea into a buildable plan.",
  },
  Settings: { tabProfile: "Profile", tabPreferences: "Preferences", tabData: "Your data" },
  Result: {
    tipConfidence:
      "Our honest read on how well this plan fits your site — stated as a sentence, not a single grade. Lower confidence means more local checks, never a worse plan.",
    tipPlanLabel:
      "How finished this plan is: a buildable estimate, a concept placement, or something that needs local verification first.",
    tipPlanLabelLabel: "Plan stage",
    tipBudget:
      "A DIY cost range from current category estimates — materials only, not labor. Treat it as a planning band, not a quote.",
    tipLabor:
      "Estimated hands-on hours and the number of weekends they roughly span. Real time varies with experience and site access.",
    tipStore:
      "Whether typical items should be in stock locally, or whether delivery is the safer bet for this plan.",
    tipTier:
      "Quick / better / best framings of the same plan at different spend levels — estimates, not separate quotes.",
    tipFitScore:
      "How well this plant matches your site's sun, soil, and space — higher means fewer compromises.",
    tipFitScoreLabel: "Plant fit",
    tipHardiness:
      "Your USDA hardiness zone from your location, used to check each plant survives local winters.",
    tipOutOfZone:
      "These plants fall outside your hardiness zone — they may not survive local winters without protection or replacement.",
    showMore: "Show {count} more",
    showLess: "Show less",
  },
  Charts: {
    budgetAxisTip:
      "Each bar is one spending category; bar length is the midpoint of its estimated cost range. Hover a bar for the full range.",
    laborAxisTip: "Each bar is one install phase; bar length is its estimated hands-on hours.",
  },
  Evidence: {
    tipConfidenceDimension:
      "Confidence is rated per dimension (like climate or soil) rather than as one overall grade, so you can see exactly where it's strong or thin.",
    tipSourceLadder:
      "Sources are ranked on a quality ladder (L1 highest): peer-reviewed and government data outrank vendor or community notes.",
  },
};

const ZH = {
  Theme: { appearance: "外观" },
  Nav: { more: "更多", moreDescription: "更多导航选项" },
  Home: {
    heroKicker: "不只是好看，更能落地。",
    stats: {
      heading: "每份方案都包含",
      deliverables: "方案模块：购物清单、施工顺序、风险、门店清单",
      steps: "施工步骤，按正确顺序排列",
      accounts: "开始前需要的账号或密钥",
    },
    bento: {
      eyebrow: "每份方案，从头到尾",
      title: "一份能动手做的方案，而不是渲染图",
      subtitle: "材料、顺序、风险、门店实际情况——在你花钱之前就都算好。",
      photoCaption: "按你家院子的真实尺寸来规划",
      shoppingBody: "植物、材料和用量都来自核心库——绝不由 AI 编造。",
      orderBody: "精确的施工顺序，避免返工。",
      risksBody: "可能出问题的地方，连同依据一起提前标出。",
      storeBody: "搜索链接与替代选项——不会假装知道库存。",
    },
    marquee: { label: "真实的院子，真实的改造" },
    capture: { badge: "用照片做方案" },
    entry: { heading: "选择你想要的开始方式", recommended: "推荐", go: "开始使用" },
  },
  Dashboard: {
    title: "欢迎回到你的庭院工作台",
    subtitle: "继续草稿、对比版本、管理照片，或切换到专业版与门店流程。",
    eyebrow: "指挥中心",
    heroAlt: "被绿色草坪和树木环绕的住宅外景",
    ctaNew: "新建项目",
    ctaPro: "专业版面板",
    statsAria: "工作台指标",
    statActive: "进行中的方案",
    statActiveHint: "你已保存、可重新打开或对比的方案。",
    statPhotos: "草稿照片",
    statPhotosHint: "当前规划草稿中的照片数量。",
    statCompare: "可对比数量",
    statCompareHint: "保存两个及以上方案即可并排对比。",
    statMode: "工作台模式",
    statModeHint: "当草稿用于客户物业时切换为专业版。",
    modeHome: "家庭",
    modePro: "专业",
    resumeTitle: "继续你最近的规划",
    resumeMeta: "{photos} 张照片，识别出 {zones} 个区域，上次保存于 {when}。",
    resumeCta: "继续草稿",
    recentTitle: "最近的项目",
    recentOpenAll: "查看已保存",
    recentEmptyTitle: "还没有已保存的项目",
    recentEmptyBody: "从照片开始，Bloomprint 会为你保留草稿。",
    recentEmptyCta: "开始规划",
    draftDefault: "草稿 1",
    confidenceSuffix: "置信度 {confidence}",
    modesTitle: "模式",
    modesSubtitle: "选择适合今天工作的流程。",
    modeHomeownerTitle: "业主",
    modeHomeownerBody: "改造自家庭院，保存版本，稍后继续。",
    modeProTitle: "园艺师 / 专业",
    modeProBody: "客户、物业，以及可用于报价的材料与人工视图。",
    modeStoreTitle: "门店助手",
    modeStoreBody: "运营建议、替代方案，以及打印/分享摘要。",
  },
  SavedPlans: {
    emptyBadge: "你的方案库",
    emptyPhotoAlt: "刚建好的高架花床",
    rowActionsAria: "方案操作",
    addToCompare: "加入对比",
    removeFromCompare: "移出对比",
    copyLink: "复制链接",
    pageAria: "第 {page} 页",
    renameHint: "为这个方案起一个方便日后识别的名称。",
    renameLabel: "方案名称",
    renameCancel: "取消",
    renameSave: "保存名称",
    toastRenamed: "已重命名为“{label}”",
    toastDeleted: "已删除“{label}”",
    toastLinkCopied: "已复制方案链接",
    toastLinkError: "无法复制链接",
  },
  Pro: {
    emptyPhotoAlt: "园艺花园小径",
    onboard1Title: "添加工作",
    onboard1Body: "记录客户项目，从线索到完工。",
    onboard2Title: "关联方案",
    onboard2Body: "为每个工作关联可执行的 Bloomprint 方案。",
    onboard3Title: "一份采购清单",
    onboard3Body: "将各工作的材料合并为一份采购清单。",
    statActiveHint: "尚未完成的工作。",
    statAwaitingHint: "已报价、等待客户确认的工作。",
    statScheduledHint: "未来一周内安装的工作。",
    statPipelineHint: "所有进行中工作的报价总额。",
    toastSampleLoaded: "已载入示例工作台",
    toastWorkspaceCleared: "工作台已清空",
    toastClientAdded: "已添加 {name}",
    toastBuyCopied: "已复制采购清单",
    toastBuyCopyError: "无法复制清单",
  },
  Account: {
    noAccountBadge: "开始使用",
    noAccountPhotoAlt: "准备生长的幼苗",
    tabOverview: "概览",
    tabData: "数据与同步",
    savedPlansHint: "保存在此设备上的方案——随时打开或对比。",
    startNewBody: "把新想法变成可执行的方案。",
  },
  Settings: { tabProfile: "个人资料", tabPreferences: "偏好设置", tabData: "你的数据" },
  Result: {
    tipConfidence:
      "我们对此方案与场地契合度的诚实判断——用一句话表达，而非单一评分。信心较低意味着需要更多本地核实，而非方案更差。",
    tipPlanLabel: "此方案的完成度：可施工的估算、概念性布局，或需先经本地核实的方案。",
    tipPlanLabelLabel: "方案阶段",
    tipBudget:
      "基于当前各类别估算的自助（DIY）费用区间——仅含材料，不含人工。请将其视为预算参考区间，而非报价。",
    tipLabor: "预估的实际动手工时及大致需要的周末数。实际用时因经验和场地条件而异。",
    tipStore: "此方案中常见物品本地通常是否有货，或是否更适合选择配送。",
    tipTier: "同一方案在不同花费水平下的快速／较好／最佳呈现——均为估算，并非独立报价。",
    tipFitScore: "此植物与场地光照、土壤和空间的契合程度——分数越高，妥协越少。",
    tipFitScoreLabel: "植物契合度",
    tipHardiness: "根据您的位置得出的 USDA 耐寒区，用于核实每种植物能否度过当地冬季。",
    tipOutOfZone: "这些植物超出了您的耐寒区——若不加以保护或更换，可能无法度过当地冬季。",
    showMore: "显示其余 {count} 项",
    showLess: "收起",
  },
  Charts: {
    budgetAxisTip:
      "每根柱形代表一个支出类别；柱长为其估算费用区间的中点。悬停柱形可查看完整区间。",
    laborAxisTip: "每根柱形代表一个安装阶段；柱长为其预估实际工时。",
  },
  Evidence: {
    tipConfidenceDimension:
      "信心按维度（如气候或土壤）分别评定，而非单一总评，以便您清楚了解各处的可靠程度。",
    tipSourceLadder:
      "来源按质量阶梯排序（L1 最高）：经同行评审的资料和政府数据高于供应商或社区信息。",
  },
};

/** Deep-merge src into dst, only filling keys that are absent (never overwrite). Returns added count. */
function mergeMissing(dst, src) {
  let added = 0;
  for (const k of Object.keys(src)) {
    if (src[k] && typeof src[k] === "object" && !Array.isArray(src[k])) {
      if (!dst[k] || typeof dst[k] !== "object") dst[k] = {};
      added += mergeMissing(dst[k], src[k]);
    } else if (!(k in dst)) {
      dst[k] = src[k];
      added++;
    }
  }
  return added;
}

for (const [file, patch] of [
  ["messages/en.json", EN],
  ["messages/zh.json", ZH],
]) {
  const json = JSON.parse(readFileSync(file, "utf8"));
  const added = mergeMissing(json, patch);
  writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
  console.log(`${file}: +${added} keys`);
}
