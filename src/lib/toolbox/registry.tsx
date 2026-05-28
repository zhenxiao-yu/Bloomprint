import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import {
  Beaker,
  Box,
  BrickWall,
  Calculator,
  CalendarDays,
  Carrot,
  Droplets,
  FlaskConical,
  Fence as FenceIcon,
  Layers,
  Leaf,
  MapPin,
  Mountain,
  Ruler,
  Scissors,
  Sparkles,
  Sprout,
  Trees,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { TOOL_CATALOG, type ToolMeta } from "@/domain/toolbox/catalog";

/**
 * UI layer of the tool registry — joins each pure {@link ToolMeta} to a lucide icon and a
 * code-split calculator component. Kept out of `src/domain` (framework-free). Consumed by the
 * client index + ToolRunner. Every catalog slug must appear in ICONS + COMPONENTS (enforced
 * by the registry-integrity test).
 */
export interface ToolEntry extends ToolMeta {
  icon: LucideIcon;
  Component: LazyExoticComponent<ComponentType>;
}

const COMPONENTS: Record<string, () => Promise<{ default: ComponentType }>> = {
  mulch: () =>
    import("@/components/toolbox/tools/MulchCalculator").then((m) => ({ default: m.MulchCalculator })),
  material: () =>
    import("@/components/toolbox/tools/MaterialCalculator").then((m) => ({ default: m.MaterialCalculator })),
  edging: () =>
    import("@/components/toolbox/tools/EdgingCalculator").then((m) => ({ default: m.EdgingCalculator })),
  bedArea: () =>
    import("@/components/toolbox/tools/BedAreaCalculator").then((m) => ({ default: m.BedAreaCalculator })),
  spacing: () =>
    import("@/components/toolbox/tools/SpacingCalculator").then((m) => ({ default: m.SpacingCalculator })),
  watering: () =>
    import("@/components/toolbox/tools/WateringCalculator").then((m) => ({ default: m.WateringCalculator })),
  plantFinder: () =>
    import("@/components/toolbox/tools/PlantFinderCalculator").then((m) => ({
      default: m.PlantFinderCalculator,
    })),
  hardiness: () =>
    import("@/components/toolbox/tools/HardinessCalculator").then((m) => ({
      default: m.HardinessCalculator,
    })),
  soilPh: () => import("@/components/toolbox/tools/SoilPhCalculator").then((m) => ({ default: m.SoilPhCalculator })),
  fertilizer: () =>
    import("@/components/toolbox/tools/FertilizerCalculator").then((m) => ({ default: m.FertilizerCalculator })),
  raisedBed: () =>
    import("@/components/toolbox/tools/RaisedBedCalculator").then((m) => ({ default: m.RaisedBedCalculator })),
  gardenAi: () =>
    import("@/components/toolbox/tools/GardenAiCalculator").then((m) => ({ default: m.GardenAiCalculator })),
  retainingWall: () =>
    import("@/components/toolbox/tools/RetainingWallCalculator").then((m) => ({
      default: m.RetainingWallCalculator,
    })),
  fence: () => import("@/components/toolbox/tools/FenceCalculator").then((m) => ({ default: m.FenceCalculator })),
  frenchDrain: () =>
    import("@/components/toolbox/tools/FrenchDrainCalculator").then((m) => ({ default: m.FrenchDrainCalculator })),
  jobQuote: () =>
    import("@/components/toolbox/tools/JobQuoteCalculator").then((m) => ({ default: m.JobQuoteCalculator })),
  seedStarting: () =>
    import("@/components/toolbox/tools/SeedStartingCalculator").then((m) => ({
      default: m.SeedStartingCalculator,
    })),
  companion: () =>
    import("@/components/toolbox/tools/CompanionCalculator").then((m) => ({ default: m.CompanionCalculator })),
  grassType: () =>
    import("@/components/toolbox/tools/GrassTypeCalculator").then((m) => ({ default: m.GrassTypeCalculator })),
};

const ICONS: Record<string, LucideIcon> = {
  mulch: Layers,
  material: Mountain,
  edging: Scissors,
  bedArea: Ruler,
  spacing: Sprout,
  watering: Droplets,
  plantFinder: Leaf,
  hardiness: MapPin,
  soilPh: FlaskConical,
  fertilizer: Beaker,
  raisedBed: Box,
  gardenAi: Sparkles,
  retainingWall: BrickWall,
  fence: FenceIcon,
  frenchDrain: Waves,
  jobQuote: Calculator,
  seedStarting: CalendarDays,
  companion: Carrot,
  grassType: Trees,
};

export const TOOL_REGISTRY: ToolEntry[] = TOOL_CATALOG.map((meta) => ({
  ...meta,
  icon: ICONS[meta.slug] ?? Layers,
  Component: lazy(COMPONENTS[meta.slug]),
}));

export function getToolEntry(slug: string): ToolEntry | undefined {
  return TOOL_REGISTRY.find((t) => t.slug === slug);
}

/** Slug → icon, for the index grid (no need to instantiate the lazy component). */
export const TOOL_ICONS = ICONS;
