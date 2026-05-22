/**
 * Estimation — materials, tools, equipment, labor, and budget.
 * Quantities derive from bed area and the plant palette; all costs stay ranged (D7).
 */
import type {
  EquipmentItem,
  LaborEstimate,
  MaterialItem,
  PlantPlacement,
  ShoppingItem,
  SiteCondition,
  StyleFamily,
  ToolItem,
  YardIntake,
  BudgetBreakdown,
  MoneyRange,
} from "@/domain/models";
import { requireMaterial, requiredTools, suggestEquipment, TOOLS } from "@/domain/data";
import type { Tuning } from "@/domain/tuning";

export interface MaterialPick {
  material: MaterialItem;
  quantity: number;
  priority: ShoppingItem["priority"];
}

const NATURALISTIC: StyleFamily[] = ["layered-pollinator", "soft-prairie"];
const STONE_STYLES: StyleFamily[] = ["modern-minimal", "clean-japanese"];

function bagsFor(areaSqft: number, coverage: number): number {
  return Math.max(1, Math.ceil(areaSqft / coverage));
}

export function estimateMaterials(
  site: SiteCondition,
  intake: YardIntake,
  style: StyleFamily,
  tuning: Tuning,
): MaterialPick[] {
  const area = site.areaSqft;
  const cheap = tuning.cheaper || intake.budgetStyle === "budget";
  const picks: MaterialPick[] = [];

  // Soil amendment
  const compost = requireMaterial("compost");
  picks.push({ material: compost, quantity: bagsFor(area, compost.coveragePerUnitSqft ?? 12), priority: "buy-first" });

  // Mulch (cedar reads warmer for cottage; shredded is the budget default)
  const mulch = requireMaterial(style === "warm-cottage" && !cheap ? "cedar-mulch" : "shredded-bark-mulch");
  picks.push({ material: mulch, quantity: bagsFor(area, mulch.coveragePerUnitSqft ?? 8), priority: "buy-first" });

  // Weed-suppressing fabric — skip for naturalistic, self-seeding styles
  if (!NATURALISTIC.includes(style)) {
    const fabric = requireMaterial("landscape-fabric");
    picks.push({ material: fabric, quantity: bagsFor(area, fabric.coveragePerUnitSqft ?? 100), priority: "buy-first" });
  }

  // Edging along the lawn side (~4 ft bed depth). Premium always uses steel.
  const linearFt = Math.max(8, Math.round(area / 4));
  const edging = requireMaterial(cheap && !tuning.premium ? "plastic-edging" : "steel-edging");
  picks.push({ material: edging, quantity: linearFt, priority: "buy-first" });

  // Decorative stone accent — adds work, so skip when cheaper/easier or "stone → mulch".
  // Premium still includes it (unless the user explicitly chose mulch over stone).
  if (
    !tuning.noStone &&
    (tuning.premium || (!cheap && !tuning.easier && (STONE_STYLES.includes(style) || intake.goal === "low-maintenance")))
  ) {
    const stone = requireMaterial("river-rock");
    picks.push({ material: stone, quantity: bagsFor(area * 0.15, stone.coveragePerUnitSqft ?? 4), priority: "can-wait" });
  }

  // Path lighting — optional by default, but a "Can Wait" finishing touch for a premium look.
  const lightingPriority = tuning.premium ? "can-wait" : "optional";
  const pathLight = requireMaterial("path-light");
  picks.push({ material: pathLight, quantity: Math.min(8, Math.max(2, Math.round(linearFt / 8))), priority: lightingPriority });
  picks.push({ material: requireMaterial("lighting-transformer"), quantity: 1, priority: lightingPriority });

  return picks;
}

export function estimateTools(materialPicks: MaterialPick[]): ToolItem[] {
  const tools = [...requiredTools()];
  const ids = new Set(materialPicks.map((p) => p.material.id));
  const categories = new Set(materialPicks.map((p) => p.material.category));
  if (ids.has("landscape-fabric")) {
    const knife = TOOLS.find((t) => t.id === "utility-knife");
    if (knife) tools.push(knife);
  }
  if (categories.has("stone")) {
    const tamper = TOOLS.find((t) => t.id === "hand-tamper");
    if (tamper) tools.push(tamper);
  }
  return tools;
}

export function estimateEquipment(site: SiteCondition): EquipmentItem[] {
  const removingLawn = ["lawn-corner", "fence-line", "driveway-edge", "patio-edge"].includes(
    site.areaType,
  );
  return suggestEquipment(site.areaSqft, removingLawn);
}

export function estimateLabor(
  placements: PlantPlacement[],
  site: SiteCondition,
  intake: YardIntake,
): LaborEstimate {
  const plantCount = placements.reduce((s, p) => s + p.quantity, 0);
  const totalHours = Number((plantCount * 0.25 + site.areaSqft * 0.07).toFixed(1));

  let people: number;
  if (intake.helpers !== undefined) people = intake.helpers + 1;
  else people = intake.effortLevel === "hire-help" || intake.effortLevel === "heavy" ? 2 : 1;
  people = Math.max(1, people);

  const rawWeekends = totalHours / (people * 8);
  const weekends = Math.max(0.5, Math.round(rawWeekends * 2) / 2);

  return { totalHours, people, weekends };
}

function sumRanges(ranges: MoneyRange[]): MoneyRange {
  return ranges.reduce(
    (acc, r) => ({ min: acc.min + r.min, max: acc.max + r.max }),
    { min: 0, max: 0 },
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  Plants: "Plants",
  mulch: "Mulch",
  stone: "Stone",
  edging: "Edging",
  soil: "Soil & compost",
  lighting: "Lighting",
  fabric: "Weed fabric",
};

export function estimateProjectBudget(
  shoppingList: ShoppingItem[],
  equipment: EquipmentItem[],
): BudgetBreakdown {
  const groups = new Map<string, MoneyRange[]>();
  for (const item of shoppingList) {
    const label = CATEGORY_LABEL[item.category] ?? item.category;
    const arr = groups.get(label) ?? [];
    arr.push(item.price);
    groups.set(label, arr);
  }

  const byCategory = [...groups.entries()].map(([category, ranges]) => ({
    category,
    price: sumRanges(ranges),
  }));

  if (equipment.length > 0) {
    byCategory.push({ category: "Equipment (rental)", price: sumRanges(equipment.map((e) => e.rentalPrice)) });
  }

  // DIY total = what you'd actually spend to build it (excludes optional upgrades & rentals).
  const core = shoppingList.filter((i) => i.priority === "buy-first" || i.priority === "can-wait");
  const diyTotal = sumRanges(core.map((i) => i.price));

  return { byCategory, diyTotal };
}
