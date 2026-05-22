/** Bloomprint Core Library — aggregated access + lookups. */
import type {
  EquipmentItem,
  MaterialItem,
  PlantRecord,
  RegionPreset,
  ToolItem,
} from "@/domain/models";
import { PLANTS } from "@/domain/data/plants";
import { MATERIALS } from "@/domain/data/materials";
import { TOOLS } from "@/domain/data/tools";
import { EQUIPMENT } from "@/domain/data/equipment";
import { REGIONS } from "@/domain/data/regions";

export { PLANTS, MATERIALS, TOOLS, EQUIPMENT, REGIONS };

export const LIBRARY_NAME = "Bloomprint Core Library";

const plantsById = new Map(PLANTS.map((p) => [p.id, p]));
const materialsById = new Map(MATERIALS.map((m) => [m.id, m]));
const regionsById = new Map(REGIONS.map((r) => [r.id, r]));

export function getPlant(id: string): PlantRecord | undefined {
  return plantsById.get(id);
}

export function getMaterial(id: string): MaterialItem | undefined {
  return materialsById.get(id);
}

export function getRegion(id: string): RegionPreset | undefined {
  return regionsById.get(id);
}

export function listRegions(): RegionPreset[] {
  return REGIONS;
}

export function requireMaterial(id: string): MaterialItem {
  const m = materialsById.get(id);
  if (!m) throw new Error(`Unknown material: ${id}`);
  return m;
}

export function requiredTools(): ToolItem[] {
  return TOOLS.filter((t) => !t.optional);
}

export function optionalTools(): ToolItem[] {
  return TOOLS.filter((t) => t.optional);
}

export function suggestEquipment(areaSqft: number, removingLawn: boolean): EquipmentItem[] {
  const out: EquipmentItem[] = [];
  if (removingLawn && areaSqft >= 150) {
    const sodCutter = EQUIPMENT.find((e) => e.id === "sod-cutter");
    if (sodCutter) out.push(sodCutter);
  }
  if (areaSqft >= 300) {
    const trailer = EQUIPMENT.find((e) => e.id === "utility-trailer");
    if (trailer) out.push(trailer);
  }
  return out;
}
