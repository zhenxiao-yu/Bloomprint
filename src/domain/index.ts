/** Public surface of the Bloomprint domain layer. Framework-free; the source of truth. */
export * from "@/domain/models";
export { generateDeterministicPlan, refinePlan, type PlanOptions } from "@/domain/plan";
export { resolveSite, resolveRegion } from "@/domain/rules";
export { resolveStyleFamily, STYLES, GOAL_STYLE_AFFINITY } from "@/domain/styles";
export { generateLayout } from "@/domain/layout";
export { deriveTuning, NO_TUNING, type Tuning } from "@/domain/tuning";
export {
  PLANTS,
  MATERIALS,
  TOOLS,
  EQUIPMENT,
  REGIONS,
  LIBRARY_NAME,
  getPlant,
  getRegion,
  listRegions,
} from "@/domain/data";
export { FIXTURES, DEMO_FIXTURE_KEY } from "@/domain/fixtures";
