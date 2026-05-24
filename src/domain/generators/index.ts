/**
 * Generators — turn scored candidates + estimates into the human-facing parts of a plan:
 * the plant composition, grouped shopping list, install phases, risks, narrative, the standout
 * insight, and the visual "hero moment" summary. All deterministic and assistant-toned (no AI).
 */
import type {
  AccuracyUpgrade,
  ConfidenceReason,
  FailurePoint,
  InstallPhase,
  MaterialCategory,
  MoneyRange,
  PlanLabel,
  PlantPlacement,
  PlantRole,
  ProjectGoal,
  Readiness,
  ReadinessFactor,
  RiskWarning,
  ShoppingItem,
  SiteCondition,
  StaffNotes,
  StyleFamily,
  VisualSummary,
  YardIntake,
} from "@/domain/models";
import { getPlant } from "@/domain/data";
import { STYLES } from "@/domain/styles";
import type { ScoredPlant } from "@/domain/scoring";
import type { MaterialPick } from "@/domain/estimation";
import type { Tuning } from "@/domain/tuning";

/* ----------------------------- composition ------------------------------ */

type RoleShares = Partial<Record<PlantRole, number>>;

const ROLE_SHARES: Record<ProjectGoal, RoleShares> = {
  privacy: { screen: 0.55, mid: 0.25, front: 0.2 },
  "curb-appeal": { structure: 0.3, mid: 0.35, front: 0.35 },
  "low-maintenance": { structure: 0.3, mid: 0.3, front: 0.4 },
  pollinator: { structure: 0.1, mid: 0.45, front: 0.45 },
  "shade-tolerant": { structure: 0.2, mid: 0.35, front: 0.45 },
  general: { structure: 0.3, mid: 0.35, front: 0.35 },
};

const CM_PER_FT = 30.48;

function footprintSqft(spacingCm: number): number {
  return Math.max(0.25, (spacingCm / CM_PER_FT) ** 2);
}

function spacingNote(spacingCm: number): string {
  return `Space about ${Math.round(spacingCm / 2.54)} in (${Math.round(spacingCm)} cm) apart.`;
}

function scaleRange(r: MoneyRange, factor: number): MoneyRange {
  return { min: Math.round(r.min * factor), max: Math.round(r.max * factor) };
}

export function matureSize(heightCm: number, widthCm: number): string {
  return `to ~${Math.round(heightCm / CM_PER_FT)} × ${Math.round(widthCm / CM_PER_FT)} ft`;
}

export function sunLabel(sun: string[]): string {
  const full = sun.includes("full-sun");
  const part = sun.includes("part-sun");
  const shade = sun.includes("shade");
  if (full && shade) return "Sun to shade";
  if (full && part) return "Full to part sun";
  if (full) return "Full sun";
  if (part && shade) return "Part sun to shade";
  if (part) return "Part sun";
  if (shade) return "Shade";
  return "Adaptable";
}

export function composePalette(
  candidates: ScoredPlant[],
  site: SiteCondition,
  intake: YardIntake,
  tuning: Tuning,
): PlantPlacement[] {
  const shares: RoleShares = { ...ROLE_SHARES[intake.goal] };

  // "More flowers" shifts area away from structure toward mid/front layers.
  if (tuning.flowerBias) {
    const moved = (shares.structure ?? 0) * 0.5;
    if (shares.structure) shares.structure -= moved;
    shares.front = (shares.front ?? 0) + moved;
  }

  // "More privacy" emphasizes a tall green screen even when privacy isn't the primary goal.
  if (tuning.privacyBoost && !shares.screen) {
    shares.screen = 0.45;
    shares.structure = (shares.structure ?? 0) * 0.4;
    shares.mid = (shares.mid ?? 0) * 0.6;
    shares.front = (shares.front ?? 0) * 0.6;
  }

  const qtyFactor = (tuning.cheaper ? 0.8 : 1) * (tuning.easier ? 0.7 : 1);
  const used = new Set<string>();
  const placements: PlantPlacement[] = [];

  for (const role of Object.keys(shares) as PlantRole[]) {
    const share = shares[role];
    if (!share) continue;
    const roleArea = site.areaSqft * share;

    const forRole = candidates.filter((c) => c.plant.roles.includes(role) && !used.has(c.plant.id));
    if (forRole.length === 0) continue;

    const speciesCount = tuning.easier ? 1 : (role === "mid" || role === "front") && roleArea >= 40 ? 2 : 1;
    const chosen = forRole.slice(0, speciesCount);
    const perSpeciesArea = roleArea / chosen.length;

    for (const cand of chosen) {
      used.add(cand.plant.id);
      const plant = cand.plant;

      let qty: number;
      if (role === "screen") {
        const lengthFt = site.areaSqft / 4; // ~4 ft deep bed → screen runs along the back
        qty = Math.max(3, Math.round(lengthFt / (plant.spacingCm / CM_PER_FT)));
      } else {
        qty = Math.max(1, Math.round(perSpeciesArea / footprintSqft(plant.spacingCm)));
      }
      qty = Math.max(1, Math.round(qty * qtyFactor));

      placements.push({
        plantId: plant.id,
        commonName: plant.commonName,
        role,
        quantity: qty,
        spacingNote: spacingNote(plant.spacingCm),
        unitPrice: plant.unitPrice,
        lineTotal: scaleRange(plant.unitPrice, qty),
        fit: cand.fit,
        type: plant.type,
        matureSize: matureSize(plant.matureHeightCm, plant.matureWidthCm),
        sunLabel: sunLabel(plant.sun),
        maintenance: plant.maintenance,
        safety: { toxic: plant.toxicToPetsOrKids, invasive: plant.invasive },
      });
    }
  }

  return placements;
}

/* ----------------------------- shopping list ----------------------------- */

const PRIORITY_ORDER: Record<ShoppingItem["priority"], number> = {
  "buy-first": 0,
  "can-wait": 1,
  optional: 2,
};

export function generateShoppingList(
  placements: PlantPlacement[],
  materialPicks: MaterialPick[],
): ShoppingItem[] {
  const items: ShoppingItem[] = [];

  for (const p of placements) {
    items.push({
      name: p.commonName,
      category: "Plants",
      quantity: p.quantity,
      unit: "plant",
      price: p.lineTotal,
      priority: "buy-first",
    });
  }

  for (const pick of materialPicks) {
    items.push({
      name: pick.material.name,
      category: pick.material.category,
      quantity: pick.quantity,
      unit: pick.material.unit,
      price: scaleRange(pick.material.unitPrice, pick.quantity),
      priority: pick.priority,
    });
  }

  items.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  return items;
}

/* ----------------------------- install phases ---------------------------- */

export function generateInstallPhases(
  totalHours: number,
  materialCategories: Set<MaterialCategory>,
): InstallPhase[] {
  const hasLighting = materialCategories.has("lighting");
  const h = (frac: number) => Number((totalHours * frac).toFixed(1));

  const phases: InstallPhase[] = [
    {
      order: 1,
      title: "Mark & clear the bed",
      description: "Lay out the bed shape, remove sod or weeds, and define a clean edge.",
      estHours: h(0.2),
      tools: ["Half-Moon Edger", "Round-Point Shovel"],
    },
    {
      order: 2,
      title: "Improve the soil",
      description: "Loosen the soil and dig in compost so new plants establish quickly.",
      estHours: h(0.2),
      tools: ["Garden Fork", "Wheelbarrow"],
    },
    {
      order: 3,
      title: "Set out & plant (back to front)",
      description: "Place everything per the layout first, then plant tallest to shortest.",
      estHours: h(0.35),
      tools: ["Round-Point Shovel", "Hand Trowel"],
    },
    {
      order: 4,
      title: "Edge & mulch",
      description: "Install edging, lay fabric where used, and finish with an even mulch layer.",
      estHours: h(hasLighting ? 0.2 : 0.25),
      tools: ["Bow Rake", "Utility Knife"],
    },
  ];

  if (hasLighting) {
    phases.push({
      order: 5,
      title: "Lighting & finishing",
      description: "Run low-voltage path lighting and tidy up the finished bed.",
      estHours: h(0.05),
      tools: [],
    });
  }

  return phases;
}

/* ----------------------------- risks ------------------------------------- */

export function generateRiskWarnings(
  site: SiteCondition,
  intake: YardIntake,
  placements: PlantPlacement[],
): RiskWarning[] {
  const risks: RiskWarning[] = [];
  const plants = placements.map((p) => getPlant(p.plantId)).filter((p): p is NonNullable<typeof p> => !!p);

  if (site.saltExposure === "yes") {
    const sensitive = plants.filter((p) => !p.saltTolerant);
    if (sensitive.length > 0) {
      risks.push({
        id: "salt",
        severity: "medium",
        message: `Road salt is a factor here, and ${sensitive.map((p) => p.commonName).join(", ")} can suffer winter burn.`,
        mitigation: "Keep salt-sensitive plants back from the curb/driveway, or swap in salt-tolerant picks.",
      });
    }
  }

  if (site.deerPressure === "high") {
    const browseable = plants.filter((p) => !p.deerResistant);
    if (browseable.length > 0) {
      risks.push({
        id: "deer",
        severity: "medium",
        message: `Deer pressure is high, and ${browseable.map((p) => p.commonName).join(", ")} may get browsed.`,
        mitigation: "Protect young plants the first season or substitute deer-resistant options.",
      });
    }
  }

  if (intake.hasPetsOrKids) {
    const toxic = plants.filter((p) => p.toxicToPetsOrKids);
    if (toxic.length > 0) {
      risks.push({
        id: "toxic",
        severity: "high",
        message: `${toxic.map((p) => p.commonName).join(", ")} can be toxic if chewed.`,
        mitigation: "Site these away from play areas, or tap “Safer for dogs” to swap them out.",
      });
    }
  }

  // Invasive status comes straight from the Core Library flag, so the caution holds
  // even when the optional live invasive-species check is off or unavailable.
  const invasive = plants.filter((p) => p.invasive);
  if (invasive.length > 0) {
    risks.push({
      id: "invasive",
      severity: "high",
      message: `${invasive.map((p) => p.commonName).join(", ")} is considered invasive in many regions and can spread aggressively.`,
      mitigation: "Check your local invasive-species list before planting, or ask staff for a well-behaved substitute.",
    });
  }

  if (site.drainage === "poor") {
    risks.push({
      id: "drainage",
      severity: "medium",
      message: "Water can sit in this area after rain.",
      mitigation: "Avoid overwatering, add compost to improve structure, or build the bed up slightly.",
    });
  }

  const unknowns = [intake.sun === "unknown", intake.soil === "unknown", intake.drainage === "unknown"].filter(
    Boolean,
  ).length;
  if (unknowns >= 2) {
    risks.push({
      id: "assumptions",
      severity: "low",
      message: "A few site details were assumed, so treat quantities as a starting estimate.",
      mitigation: "Answer the accuracy questions to tighten the plan.",
    });
  }

  return risks;
}

/* ----------------------------- narrative & insight ----------------------- */

// Yard psychology: frame the goal as the *feeling* people are actually buying, not the mechanic.
const GOAL_PHRASE: Record<ProjectGoal, string> = {
  privacy: "creates a quieter, more enclosed feeling by screening the neighbors' view",
  "curb-appeal": "makes the front of your home feel cared-for and welcoming",
  "low-maintenance": "is designed to stay clean-looking without constant trimming",
  pollinator: "turns the space into a lively, bee-and-butterfly-friendly garden",
  "shade-tolerant": "brings a calm, leafy feeling to a shadier corner",
  general: "gives the space a fresh, intentional feeling",
};

const GOAL_BEFORE: Record<ProjectGoal, string> = {
  privacy: "An open yard with little separation from the neighbors",
  "curb-appeal": "A plain or patchy front with weak structure",
  "low-maintenance": "A bed that takes more weekend upkeep than you want",
  pollinator: "A tidy but lifeless space with little for pollinators",
  "shade-tolerant": "A bare, awkward spot that struggles in the shade",
  general: "An underused, undefined corner of the yard",
};

const GOAL_FEELING: Record<ProjectGoal, string> = {
  privacy: "This shifts the yard from exposed to calm, private, and enclosed.",
  "curb-appeal": "This shifts the front from forgettable to polished and welcoming.",
  "low-maintenance": "This shifts your weekends from chores to simply enjoying the yard.",
  pollinator: "This shifts a quiet bed into a space buzzing with life.",
  "shade-tolerant": "This shifts an awkward shady spot into a lush, restful one.",
  general: "This shifts the space from neglected to intentional and finished.",
};

function namesByRole(placements: PlantPlacement[], roles: PlantRole[]): string[] {
  return placements.filter((p) => roles.includes(p.role)).map((p) => p.commonName);
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function generatePlanNarrative(
  style: StyleFamily,
  placements: PlantPlacement[],
  intake: YardIntake,
): string {
  const meta = STYLES[style];
  const structure = joinNames(namesByRole(placements, ["structure", "screen"]));
  const mid = joinNames(namesByRole(placements, ["mid"]));
  const front = joinNames(namesByRole(placements, ["front", "accent"]));

  const parts: string[] = [`This ${meta.label.toLowerCase()} plan ${GOAL_PHRASE[intake.goal]}.`];
  const layers: string[] = [];
  if (structure) layers.push(`${structure} for year-round structure`);
  if (mid) layers.push(`${mid} through the middle`);
  if (front) layers.push(`${front} along the front edge`);
  if (layers.length) parts.push(`It uses ${joinNames(layers)}, finished with a clean mulched border.`);

  const lowMaint = placements.every((p) => (getPlant(p.plantId)?.maintenance ?? "low") === "low");
  parts.push(
    lowMaint
      ? "Almost everything here is low-maintenance, so it should stay easy to care for."
      : "A couple of picks reward a little seasonal care with a longer, fuller show.",
  );

  return parts.join(" ");
}

const NARROW_AREAS = ["driveway-edge", "front-walkway", "foundation-bed"];

/**
 * The standout, "that's smart" observation — the moat. Never generic ("plants suited to your
 * region"); always tied to a concrete, specific feature of *this* yard. Most salient first.
 */
export function deriveInsight(
  site: SiteCondition,
  intake: YardIntake,
  placements: PlantPlacement[],
): string {
  const hasScreen = placements.some((p) => p.role === "screen");

  if (site.saltExposure === "yes" && site.areaType === "driveway-edge") {
    return "A driveway edge takes the brunt of winter salt spray, so this plan deliberately avoids the most salt-sensitive evergreens and uses tougher, salt-proof picks instead.";
  }
  if (hasScreen && NARROW_AREAS.includes(site.areaType)) {
    return "The screen is spaced to knit into a solid wall as it matures — sidestepping the cedar-overcrowding that plagues narrow suburban front beds, where plants get jammed in and thin out within a few years.";
  }
  if (site.saltExposure === "yes" && placements.every((p) => getPlant(p.plantId)?.saltTolerant !== false)) {
    return "Because this spot likely sees road salt, the plan leans on salt-tolerant plants that shrug off winter spray instead of browning out by March.";
  }
  if (site.soil === "clay") {
    return "Your soil is likely heavy clay, so the plan favors plants that actually tolerate it and front-loads compost to open the bed up — the step most DIY plantings skip and regret.";
  }
  if (site.drainage === "poor") {
    return "Because water tends to sit here after rain, the plan avoids plants that hate wet feet and builds the bed up slightly so roots don't drown.";
  }
  if (site.deerPressure === "high") {
    return "Deer pressure is high here, so the palette leans on plants deer reliably walk past — saving you from the usual first-spring browse damage.";
  }
  if (intake.goal === "shade-tolerant" || site.sun === "shade") {
    return "This is a shadier spot, so the plan uses true shade-lovers that thrive out of direct sun rather than sun plants that would just stretch and sulk.";
  }
  if (intake.budget !== undefined && intake.budget < 500) {
    return "Your budget fits a focused, high-impact refresh rather than a full installation — so the plan concentrates plants where they show most and leaves the rest as easy add-ons.";
  }
  if (intake.goal === "privacy") {
    return "The screen plants are spaced to knit into a solid wall of green without overcrowding, so you buy fewer plants and they still fill in completely.";
  }
  return "The layout deliberately leaves room for mature growth, so it still looks clean and intentional in a few years instead of crowded and overgrown.";
}

/* ----------------------------- visual summary ---------------------------- */

function formatWeekends(weekends: number): string {
  if (weekends <= 1) return "About a weekend";
  if (!Number.isInteger(weekends)) return `About ${Math.floor(weekends)}–${Math.ceil(weekends)} weekends`;
  return `About ${weekends} weekends`;
}

const EFFORT_LABEL: Record<YardIntake["effortLevel"], string> = {
  light: "light DIY",
  moderate: "moderate DIY",
  heavy: "heavy DIY",
  "hire-help": "some hired help",
};

export function buildVisualSummary(
  style: StyleFamily,
  placements: PlantPlacement[],
  weekends: number,
  intake: YardIntake,
): VisualSummary {
  const meta = STYLES[style];
  const types = new Set(placements.map((p) => getPlant(p.plantId)?.type));

  const whatChangesVisually: string[] = [];
  if (types.has("evergreen")) whatChangesVisually.push("Adds year-round structure with evergreens");
  if (types.has("grass")) whatChangesVisually.push("Softens the look with airy grasses");
  if (types.has("perennial") || types.has("shrub"))
    whatChangesVisually.push("Brings seasonal color through the year");
  whatChangesVisually.push("Defines a clean, mulched border along the lawn");

  const lowMaint = placements.every((p) => (getPlant(p.plantId)?.maintenance ?? "low") === "low");
  const expectedEffort = `${formatWeekends(weekends)} · ${EFFORT_LABEL[intake.effortLevel]} · ${
    lowMaint ? "low upkeep" : "moderate upkeep"
  }`;

  const hasStructure = placements.some((p) => p.role === "structure" || p.role === "screen");
  const plannedBits: string[] = [];
  if (hasStructure) plannedBits.push("evergreen structure");
  if (types.has("grass")) plannedBits.push("soft grasses");
  if (types.has("perennial")) plannedBits.push("seasonal color");
  const planned = `A ${meta.label.toLowerCase()} layout with ${
    plannedBits.length ? joinNames(plannedBits) : "layered planting"
  } and a clean, mulched edge`;

  return {
    styleLabel: meta.label,
    moodChips: meta.moodChips,
    whatChangesVisually,
    expectedEffort,
    transformation: {
      current: GOAL_BEFORE[intake.goal],
      planned,
      feeling: GOAL_FEELING[intake.goal],
    },
  };
}

/* ----------------------------- staff notes ------------------------------- */

const ROLE_SUBS: Record<string, string> = {
  "emerald-cedar": "Black Cedar or Inkberry Holly",
  "green-velvet-boxwood": "Inkberry Holly (boxwood-blight resistant)",
  "hicks-yew": "Inkberry Holly or a dwarf evergreen",
  "limelight-hydrangea": "a paniculata hydrangea like 'Bobo' if space is tight",
};

/** Practical, deterministic notes for staff — works without AI (docs/SPEC.md §6). */
export function buildStaffNotes(
  placements: PlantPlacement[],
  site: SiteCondition,
  shoppingList: ShoppingItem[],
): StaffNotes {
  const plants = placements
    .map((p) => getPlant(p.plantId))
    .filter((p): p is NonNullable<typeof p> => !!p);

  // What customers routinely underestimate, grounded in this plan's own numbers.
  const customerUnderestimates: string[] = [];
  const mulch = shoppingList.find((i) => i.category === "mulch");
  if (mulch) customerUnderestimates.push(`Mulch volume — this bed needs about ${mulch.quantity} ${mulch.unit}s.`);
  const widest = [...plants].sort((a, b) => b.matureWidthCm - a.matureWidthCm)[0];
  if (widest)
    customerUnderestimates.push(
      `Mature width — ${widest.commonName} spreads to about ${Math.round(widest.matureWidthCm / 30.48)} ft, wider than it looks in the pot.`,
    );
  if (site.soil === "clay" || site.drainage === "poor")
    customerUnderestimates.push("Soil prep — heavy/wet soil needs compost worked in before planting.");

  // Substitutions for when something is out of stock.
  const substitutions: string[] = [];
  for (const p of placements) {
    const sub = ROLE_SUBS[p.plantId];
    if (sub) substitutions.push(`${p.commonName} → ${sub}`);
  }
  if (substitutions.length === 0)
    substitutions.push("Most picks have close cousins in the same size/role if a variety is out of stock.");

  // Genuine, relevant upsells (grounded in the build, not pushy).
  const upsells: string[] = [];
  if (shoppingList.some((i) => i.category === "edging")) upsells.push("Edging for a crisp, finished border");
  if (!shoppingList.some((i) => i.category === "fabric")) upsells.push("Landscape fabric to cut down on weeding");
  upsells.push("Starter fertilizer or root stimulant for establishment");
  if (shoppingList.some((i) => i.category === "lighting")) upsells.push("Low-voltage lighting to extend the bed into the evening");
  upsells.push("A soaker/drip hose to make first-season watering effortless");

  const questionsFirst = [
    "How many hours of direct sun does this spot get in June?",
    "Is water sitting here after a heavy rain, or does it drain away?",
    site.saltExposure === "yes"
      ? "Does snow or road salt get piled against this bed?"
      : "What mature height do you actually need before this feels finished?",
  ];

  const hasPrivacy = placements.some((p) => p.role === "screen");
  const goodBetterBest = [
    `Good: build the Buy First list now with ${placements[0]?.commonName ?? "the highest-fit plants"} and mulch.`,
    hasPrivacy
      ? "Better: add the full screen layer plus edging so the bed reads as intentional from day one."
      : "Better: add edging and repeat the strongest plant for a cleaner finished look.",
    shoppingList.some((i) => i.category === "lighting")
      ? "Best: include low-voltage lighting after planting, once the bed line is set."
      : "Best: upgrade pot sizes for the structure plants and add lighting later.",
  ];

  const ifTooExpensive = [
    "Reduce pot size before reducing spacing; spacing mistakes are harder to fix.",
    "Keep the structure plants and mulch, then defer decorative stone, lighting, or extra perennials.",
  ];
  const ifNoTruckOrDelivery = [
    "Avoid pushing stone or bulk soil if the customer cannot haul heavy bags.",
    "Suggest mulch, smaller bag counts, or store delivery for soil and stone.",
  ];
  const ifDogKidSafetyMatters = [
    "Point them to the plant tag and confirm toxicity before checkout.",
    "Steer play-area edges toward non-toxic, thorn-free, lower-maintenance picks.",
  ];
  const ifOutOfStock = [
    "Match by role, mature size, sun tolerance, and maintenance level before matching by flower color.",
    ...substitutions.slice(0, 3),
  ];
  const whatNotToSell = [
    site.saltExposure === "yes"
      ? "Do not sell salt-sensitive plants for spots where snow piles against the driveway."
      : "Do not sell a plant just because it is blooming today if the mature size is wrong.",
    "Do not recommend tight spacing to make the bed look full immediately; it creates a removal problem later.",
  ];

  return {
    questionsFirst,
    customerUnderestimates,
    goodBetterBest,
    ifTooExpensive,
    ifNoTruckOrDelivery,
    ifDogKidSafetyMatters,
    ifOutOfStock,
    substitutions,
    upsells,
    whatNotToSell,
    disclaimer: "Guidance only, not a guarantee. Confirm local availability, the customer's actual site conditions, and product labels.",
  };
}

/* ----------------------------- top actions, confidence, labels ----------- */

export function buildTopActions(risks: RiskWarning[]): string[] {
  const actions = [
    "Mark out the bed and clear the sod",
    "Pick up the Buy First plants and materials",
    "Plant back-to-front over a weekend, then edge and mulch",
  ];
  const high = risks.find((r) => r.severity === "high");
  if (high) actions.push(`Heads up: ${high.message} ${high.mitigation}`);
  return actions;
}

export function buildConfidenceReasons(
  site: SiteCondition,
  intake: YardIntake,
  regionRecognized: boolean,
): ConfidenceReason[] {
  const reasons: ConfidenceReason[] = [];
  if (site.zoneMatch) reasons.push({ kind: "good", text: `Hardiness zone from ${site.zoneMatch.label}` });
  if (intake.budget !== undefined) reasons.push({ kind: "good", text: "Fits the budget you gave" });
  if (intake.goal === "low-maintenance") reasons.push({ kind: "good", text: "Built around low-maintenance plants" });
  if (regionRecognized && !site.zoneMatch)
    reasons.push({ kind: "good", text: `Matched to ${site.regionId.replace(/-/g, " ")}` });

  if (intake.sun === "unknown") reasons.push({ kind: "caveat", text: "Sun exposure was assumed" });
  if (intake.soil === "unknown") reasons.push({ kind: "caveat", text: "Soil type was assumed" });
  if (intake.drainage === "unknown") reasons.push({ kind: "caveat", text: "Drainage was assumed" });
  if (site.saltExposure === "yes") reasons.push({ kind: "caveat", text: "Road salt may affect sensitive plants" });

  if (reasons.length === 0) reasons.push({ kind: "good", text: "Based on the details you provided" });
  return reasons;
}

const UPGRADE_QUESTIONS: Record<AccuracyUpgrade["field"], string> = {
  sun: "How much sun does this area get?",
  soil: "What is the soil like — clay, loam, or sandy?",
  drainage: "Does water sit here after rain?",
  tools: "Which tools do you already own?",
  helpers: "Will anyone help with the work?",
};

export function buildAccuracyUpgrades(intake: YardIntake): AccuracyUpgrade[] {
  const ups: AccuracyUpgrade[] = [];
  if (intake.sun === "unknown") ups.push({ field: "sun", question: UPGRADE_QUESTIONS.sun });
  if (intake.soil === "unknown") ups.push({ field: "soil", question: UPGRADE_QUESTIONS.soil });
  if (intake.drainage === "unknown") ups.push({ field: "drainage", question: UPGRADE_QUESTIONS.drainage });
  if (intake.ownedTools === undefined) ups.push({ field: "tools", question: UPGRADE_QUESTIONS.tools });
  if (intake.helpers === undefined) ups.push({ field: "helpers", question: UPGRADE_QUESTIONS.helpers });
  return ups;
}

export function choosePlanLabel(
  confidenceValue: number,
  regionRecognized: boolean,
): PlanLabel {
  if (!regionRecognized || confidenceValue < 0.5) return "needs-local-verification";
  return "buildable-estimate";
}

/* ----------------------------- failure points & readiness ----------------- */

/** "This plan may fail if…" + how to reduce the risk — a concrete trust builder. */
export function generateFailurePoints(
  site: SiteCondition,
  intake: YardIntake,
  placements: PlantPlacement[],
): FailurePoint[] {
  const out: FailurePoint[] = [];

  if (intake.sun === "unknown") {
    out.push({
      risk: "The area gets less sun than assumed.",
      fix: "Answer the sun question above, or switch to a shade-friendlier version with the chips.",
    });
  }
  if (site.drainage === "poor" || intake.drainage === "unknown") {
    out.push({
      risk: "Soil stays wet after rain and roots sit in water.",
      fix: "Work compost in, build the bed up slightly, and avoid drought-loving plants in low spots.",
    });
  }
  if (placements.some((p) => p.role === "screen")) {
    out.push({
      risk: "Screen plants are planted too close and thin out as they mature.",
      fix: "Follow each plant's spacing note — fewer, well-spaced plants fill in better.",
    });
  }
  out.push({
    risk: "First-year watering is skipped and new plants don't establish.",
    fix: "Water deeply for the first weeks (the calendar reminders help); consider watering bags.",
  });
  if (site.saltExposure === "yes") {
    out.push({
      risk: "Snow and road salt pile against evergreens over winter.",
      fix: "Keep salt-sensitive plants back from the curb, or use the salt-tolerant chip.",
    });
  }
  return out;
}

const READINESS_LABELS: { min: number; label: string }[] = [
  { min: 85, label: "Ready to build" },
  { min: 65, label: "Almost there" },
  { min: 40, label: "Getting there" },
  { min: 0, label: "Just getting started" },
];

/** Gamified completeness meter — known details fill it up; unknowns are the quest. */
export function computeReadiness(intake: YardIntake): Readiness {
  const factors: ReadinessFactor[] = [
    { label: "Location set", done: true },
    { label: "Goal chosen", done: true },
    { label: "Budget given", done: intake.budget !== undefined },
    { label: "ZIP / postal added", done: Boolean(intake.locationQuery) },
    { label: "Sun confirmed", done: intake.sun !== "unknown" },
    { label: "Soil confirmed", done: intake.soil !== "unknown" },
    { label: "Drainage confirmed", done: intake.drainage !== "unknown" },
  ];
  const done = factors.filter((f) => f.done).length;
  const score = Math.round((done / factors.length) * 100);
  const label = READINESS_LABELS.find((l) => score >= l.min)?.label ?? "Getting there";
  return { score, label, factors };
}
