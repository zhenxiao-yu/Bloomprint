/**
 * Style families — controlled variation so the engine doesn't always output the same
 * cedars-grasses-hydrangeas plan (docs/SPEC.md §10 "generic/repetitive plans").
 */
import type { ProjectGoal, StyleFamily, YardIntake } from "@/domain/models";

export interface StyleMeta {
  family: StyleFamily;
  label: string;
  moodChips: string[];
  blurb: string;
}

export const STYLES: Record<StyleFamily, StyleMeta> = {
  "modern-minimal": {
    family: "modern-minimal",
    label: "Modern Minimal",
    moodChips: ["clean lines", "evergreen structure", "low upkeep"],
    blurb: "Restrained palette with strong evergreen shapes and tidy edges.",
  },
  "warm-cottage": {
    family: "warm-cottage",
    label: "Warm Cottage",
    moodChips: ["soft", "flowering", "welcoming"],
    blurb: "Layered flowering shrubs and perennials for a lush, friendly look.",
  },
  "clean-japanese": {
    family: "clean-japanese",
    label: "Clean Japanese-Inspired",
    moodChips: ["calm", "textural", "balanced"],
    blurb: "Sculptural evergreens, soft grasses, and quiet negative space.",
  },
  "layered-pollinator": {
    family: "layered-pollinator",
    label: "Layered Pollinator",
    moodChips: ["alive with bees", "seasonal color", "naturalistic"],
    blurb: "Perennials and grasses layered to feed pollinators across the seasons.",
  },
  "soft-prairie": {
    family: "soft-prairie",
    label: "Soft Prairie",
    moodChips: ["airy grasses", "drought tough", "movement"],
    blurb: "Drought-tolerant grasses and perennials that sway and self-sustain.",
  },
};

/** Preferred style families per goal, best first. Used for deterministic style selection. */
export const GOAL_STYLE_AFFINITY: Record<ProjectGoal, StyleFamily[]> = {
  privacy: ["modern-minimal", "clean-japanese", "warm-cottage", "soft-prairie", "layered-pollinator"],
  "curb-appeal": ["warm-cottage", "modern-minimal", "clean-japanese", "layered-pollinator", "soft-prairie"],
  "low-maintenance": ["modern-minimal", "soft-prairie", "clean-japanese", "layered-pollinator", "warm-cottage"],
  pollinator: ["layered-pollinator", "soft-prairie", "warm-cottage", "modern-minimal", "clean-japanese"],
  "shade-tolerant": ["clean-japanese", "warm-cottage", "modern-minimal", "layered-pollinator", "soft-prairie"],
  general: ["warm-cottage", "modern-minimal", "soft-prairie", "clean-japanese", "layered-pollinator"],
};

/** Small stable hash so distinct intakes spread across style families (but stay deterministic). */
function intakeSpread(intake: YardIntake): number {
  const seed = `${intake.regionId}|${intake.areaType ?? ""}|${intake.areaSqft ?? 0}|${intake.budget ?? 0}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Resolve the style family deterministically. Priority: explicit pick → goal affinity, nudged by
 * a stable spread so different yards don't all land on the same style.
 */
export function resolveStyleFamily(intake: YardIntake): StyleFamily {
  if (intake.stylePreference) return intake.stylePreference;
  const ranked = GOAL_STYLE_AFFINITY[intake.goal];
  // Pick from the top two affinities using the spread, so the goal still dominates.
  const idx = intakeSpread(intake) % 2;
  return ranked[idx] ?? ranked[0];
}
