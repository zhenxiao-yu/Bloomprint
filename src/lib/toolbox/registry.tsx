import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import {
  Droplets,
  Layers,
  Leaf,
  Mountain,
  Ruler,
  Scissors,
  Sprout,
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
};

const ICONS: Record<string, LucideIcon> = {
  mulch: Layers,
  material: Mountain,
  edging: Scissors,
  bedArea: Ruler,
  spacing: Sprout,
  watering: Droplets,
  plantFinder: Leaf,
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
