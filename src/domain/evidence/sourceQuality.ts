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

function source(
  input: Omit<SourceRef, "sourceName" | "sourceQuality" | "supports" | "needsLocalVerification"> & {
    supports?: string[];
    needsLocalVerification?: boolean;
    sourceQuality?: string;
  },
): SourceRef {
  return {
    ...input,
    sourceName: input.name,
    supports: input.supports ?? [],
    needsLocalVerification: input.needsLocalVerification ?? false,
    sourceQuality: input.sourceQuality ?? SOURCE_LEVELS.find((l) => l.level === input.level)?.name,
  };
}

export const TRUSTED_SOURCES = {
  userInput: source({
    name: "Your inputs",
    sourceType: "user-input",
    level: 1,
    supports: ["goal", "budget", "effort", "known site conditions"],
    confidence: "high",
    notes: "Confirmed by you during intake.",
  }),
  coreLibrary: source({
    name: "Bloomprint Core Library",
    sourceType: "core-library",
    level: 2,
    supports: ["plant roles", "spacing", "budget ranges", "labor estimates"],
    confidence: "good",
  }),
  usdaHardiness: source({
    name: "USDA Plant Hardiness Zone Map",
    sourceType: "official",
    level: 3,
    url: "https://planthardiness.ars.usda.gov/",
    supports: ["regional hardiness context"],
    confidence: "good",
    sourceQuality: "Official sources",
    needsLocalVerification: true,
  }),
  canadaHardiness: source({
    name: "Canada Plant Hardiness (NRCan)",
    sourceType: "official",
    level: 3,
    url: "https://planthardiness.gc.ca/",
    supports: ["regional hardiness context"],
    confidence: "good",
    sourceQuality: "Official sources",
    needsLocalVerification: true,
  }),
  nrcsSoil: source({
    name: "USDA-NRCS Web Soil Survey",
    sourceType: "official",
    level: 3,
    url: "https://websoilsurvey.nrcs.usda.gov/",
    supports: ["soil verification reference"],
    confidence: "medium",
    sourceQuality: "Official sources",
    needsLocalVerification: true,
  }),
};

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
  if (intake.problemType) inputs.push(`Problem: ${intake.problemType.replace(/_/g, " ")}`);
  if (intake.scope) inputs.push(`Scope: ${intake.scope.replace(/_/g, " ")}`);
  if (site.zoneMatch) inputs.push(`Location: ${site.zoneMatch.label}`);
  if (intake.budget !== undefined) inputs.push(`Budget: ~$${intake.budget.toLocaleString()}`);
  inputs.push(`Effort: ${intake.effortLevel.replace("-", " ")}`);
  if (intake.sun !== "unknown") inputs.push(`Sun: ${intake.sun.replace("-", " ")}`);
  if (intake.measurement) {
    const m = intake.measurement;
    const size =
      m.length !== undefined && m.width !== undefined
        ? `${m.length}×${m.width} ${m.unit}`
        : m.area !== undefined
          ? `${m.area} ${m.unit}²`
          : "provided";
    inputs.push(`Measured: ${size} (${m.source.replace(/_/g, " ")}, ${m.confidence} confidence)`);
  }
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

  const needsLocalVerification = [
    "Confirm plant tags against your exact sun exposure, mature size, and local hardiness guidance.",
    "Call or search local stores before driving; Bloomprint does not know live inventory.",
  ];
  if (intake.soil === "unknown" || intake.drainage === "unknown") {
    needsLocalVerification.push("Check soil and drainage before buying moisture-sensitive plants.");
  }
  if (intake.hasPetsOrKids) {
    needsLocalVerification.push("Verify toxicity and safety on the plant label before planting near pets or play areas.");
  }

  const fallbackNotes = [
    "Live data is optional and currently treated as supporting context only.",
    "Missing live checks do not block the deterministic plan.",
  ];

  return {
    inputs,
    assumptions: site.assumptions,
    sources,
    confidenceByDimension,
    needsLocalVerification,
    fallbackNotes,
  };
}
