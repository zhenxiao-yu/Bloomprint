/**
 * Maps install phases (+ a little intake context) to curated how-to topics. Pure and deterministic.
 * Guarantees every phase yields at least one guide so the UI never shows an empty "how-to" slot.
 */
import type { GuideLink, MaterialCategory, YardIntake } from "@/domain/models";
import { guideFor } from "@/domain/guides/catalog";

export { GUIDE_CATALOG, TUTORIAL_CATALOG, guideFor, tutorialFor } from "@/domain/guides/catalog";

/**
 * @param phaseTitle  the install phase title from generators/index.ts
 * @param materialCategories  categories present in the plan (drives stone/lighting guides)
 * @param intake  for goal/problem/soil/pets context
 */
export function guidesForPhase(
  phaseTitle: string,
  materialCategories: Set<MaterialCategory>,
  intake: YardIntake,
): GuideLink[] {
  const title = phaseTitle.toLowerCase();
  const topics = new Set<Parameters<typeof guideFor>[0]>();

  if (title.includes("clear")) {
    topics.add("measure_garden_bed");
    if (intake.problemType === "dead_plants" || intake.problemType === "overgrown") {
      topics.add("remove_dead_shrub");
    }
  }

  if (title.includes("soil")) {
    topics.add(intake.soil === "clay" ? "amend_clay_soil" : "water_new_shrubs");
  }

  if (title.includes("plant")) {
    topics.add("plant_evergreen_shrub");
    if (intake.goal === "privacy" || intake.problemType === "privacy_gap") {
      topics.add("improve_privacy_strip");
    }
    if (intake.hasPetsOrKids) topics.add("choose_pet_safe_plants");
  }

  if (title.includes("mulch") || title.includes("edge")) {
    topics.add("install_no_dig_edging");
    topics.add("add_mulch");
    if (materialCategories.has("stone")) topics.add("lay_landscape_stone");
  }

  if (title.includes("lighting") || title.includes("finishing")) {
    topics.add("water_new_shrubs");
  }

  // Safety net: never return an empty list for a known phase.
  if (topics.size === 0) topics.add("measure_garden_bed");

  return [...topics].map(guideFor);
}
