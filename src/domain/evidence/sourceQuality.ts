/**
 * Source Quality Ladder + plan evidence (docs/SPEC.md).
 *
 * Trust is earned by showing *what we know, what we assume, and where it comes from*. Sources are
 * ranked 1–6; AI-only inference (level 6) may shape wording but never drives a hard recommendation.
 */
import type { ConfidenceDimension, PlanEvidence, SiteCondition, SourceRef, YardIntake } from "@/domain/models";
import { getRegion } from "@/domain/data";

export interface SourceLevel {
  level: number;
  name: string;
  description: string;
}

export const SOURCE_LEVELS: SourceLevel[] = [
  { level: 1, name: "Your input", description: "What you told us directly." },
  { level: 2, name: "Bloomprint Core Library", description: "Curated plant / material / labor data." },
  { level: 3, name: "Official sources", description: "USDA, USDA-NRCS, Natural Resources Canada." },
  { level: 4, name: "Extension / botanical", description: "University extension & botanical-garden guidance." },
  { level: 5, name: "Retailer / cost references", description: "Shopping context — not biological truth." },
  { level: 6, name: "AI inference", description: "Wording / low-confidence suggestions only." },
];

export const TRUSTED_SOURCES = {
  userInput: { name: "Your inputs", level: 1 as const },
  coreLibrary: { name: "Bloomprint Core Library", level: 2 as const },
  usdaHardiness: {
    name: "USDA Plant Hardiness Zone Map",
    level: 3 as const,
    url: "https://planthardiness.ars.usda.gov/",
  },
  canadaHardiness: {
    name: "Canada Plant Hardiness (NRCan)",
    level: 3 as const,
    url: "https://planthardiness.gc.ca/",
  },
  nrcsSoil: {
    name: "USDA-NRCS Web Soil Survey",
    level: 3 as const,
    url: "https://websoilsurvey.nrcs.usda.gov/",
  },
} as const;

const GOAL_TEXT: Record<string, string> = {
  privacy: "privacy",
  "curb-appeal": "curb appeal",
  "low-maintenance": "low maintenance",
  pollinator: "pollinators",
  "shade-tolerant": "a shady spot",
  general: "a general refresh",
};

export function buildPlanEvidence(site: SiteCondition, intake: YardIntake): PlanEvidence {
  const region = getRegion(site.regionId);
  const inputs: string[] = [
    `Region: ${region?.label ?? site.regionId}`,
    `Goal: ${GOAL_TEXT[intake.goal] ?? intake.goal}`,
  ];
  if (site.zoneMatch) inputs.push(`Location: ${site.zoneMatch.label}`);
  if (intake.budget !== undefined) inputs.push(`Budget: ~$${intake.budget.toLocaleString()}`);
  inputs.push(`Effort: ${intake.effortLevel.replace("-", " ")}`);
  if (intake.sun !== "unknown") inputs.push(`Sun: ${intake.sun.replace("-", " ")}`);
  if (intake.hasPetsOrKids) inputs.push("Pets/kids: yes");

  const sources: SourceRef[] = [
    TRUSTED_SOURCES.userInput,
    TRUSTED_SOURCES.coreLibrary,
    TRUSTED_SOURCES.usdaHardiness,
    TRUSTED_SOURCES.canadaHardiness,
  ];
  if (site.soil === "unknown" || intake.soil === "unknown") sources.push(TRUSTED_SOURCES.nrcsSoil);

  const climate = site.zoneMatch?.precision === "good" ? "High" : "Medium";
  const soil = intake.soil === "unknown" ? "Low (assumed)" : "Medium";
  const budget = intake.budget !== undefined ? "Medium" : "Assumed";
  const confidenceByDimension: ConfidenceDimension[] = [
    { dimension: "Climate / hardiness", level: climate },
    { dimension: "Budget", level: budget },
    { dimension: "Soil & drainage", level: soil },
    { dimension: "Store availability", level: "Needs local check" },
  ];

  return { inputs, assumptions: site.assumptions, sources, confidenceByDimension };
}
