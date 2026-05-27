/**
 * Toolbox catalog — the single source of truth for which tools exist.
 *
 * Framework-free (no React/icons): imported by `generateStaticParams`, tests, and the
 * lib-level registry (which adds icons + lazy components). Every slug here MUST have a
 * component + icon in `src/lib/toolbox/registry.tsx` and a `Tools.<slug>` block in both
 * messages/en.json and messages/zh.json — enforced by the registry-integrity test.
 */
export const TOOL_PERSONAS = [
  "homeowner",
  "pro",
  "store-staff",
  "yard-enthusiast",
  "plant-enthusiast",
] as const;
export type ToolPersona = (typeof TOOL_PERSONAS)[number];

export const TOOL_CATEGORIES = [
  "materials",
  "hardscape",
  "lawn",
  "planting",
  "lookup",
  "climate",
  "budget",
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export type ToolEffort = "instant" | "quick" | "involved";

export interface ToolMeta {
  /** URL segment + i18n key under `Tools.<slug>`. */
  slug: string;
  category: ToolCategory;
  personas: ToolPersona[];
  effort: ToolEffort;
  /** Tool enriches with a live API but still works fully offline. */
  usesLiveData?: boolean;
}

export const TOOL_CATALOG: readonly ToolMeta[] = [
  { slug: "mulch", category: "materials", personas: ["homeowner", "pro", "store-staff"], effort: "instant" },
  { slug: "soil", category: "materials", personas: ["homeowner", "pro"], effort: "instant" },
  { slug: "compost", category: "materials", personas: ["homeowner", "pro", "yard-enthusiast"], effort: "instant" },
  { slug: "gravel", category: "materials", personas: ["homeowner", "pro"], effort: "instant" },
  { slug: "edging", category: "hardscape", personas: ["homeowner", "pro"], effort: "instant" },
  { slug: "bedArea", category: "hardscape", personas: ["homeowner", "pro", "yard-enthusiast"], effort: "instant" },
];

export const TOOL_SLUGS: readonly string[] = TOOL_CATALOG.map((t) => t.slug);

export function getToolMeta(slug: string): ToolMeta | undefined {
  return TOOL_CATALOG.find((t) => t.slug === slug);
}
