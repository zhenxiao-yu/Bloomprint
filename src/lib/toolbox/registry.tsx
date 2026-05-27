import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import {
  Layers,
  Mountain,
  Ruler,
  Scissors,
  Shovel,
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
  soil: () => import("@/components/toolbox/tools/SoilCalculator").then((m) => ({ default: m.SoilCalculator })),
  compost: () =>
    import("@/components/toolbox/tools/CompostCalculator").then((m) => ({ default: m.CompostCalculator })),
  gravel: () =>
    import("@/components/toolbox/tools/GravelCalculator").then((m) => ({ default: m.GravelCalculator })),
  edging: () =>
    import("@/components/toolbox/tools/EdgingCalculator").then((m) => ({ default: m.EdgingCalculator })),
  bedArea: () =>
    import("@/components/toolbox/tools/BedAreaCalculator").then((m) => ({ default: m.BedAreaCalculator })),
};

const ICONS: Record<string, LucideIcon> = {
  mulch: Layers,
  soil: Shovel,
  compost: Sprout,
  gravel: Mountain,
  edging: Scissors,
  bedArea: Ruler,
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
