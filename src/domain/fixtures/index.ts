/** Demo yard intakes — deterministic fixtures used by the demo flow and tests. */
import type { YardIntake } from "@/domain/models";

export const FIXTURES: Record<string, YardIntake> = {
  "oakville-front-yard": {
    regionId: "gta-ontario",
    goal: "curb-appeal",
    budget: 900,
    budgetStyle: "balanced",
    effortLevel: "moderate",
    areaType: "foundation-bed",
    areaSqft: 140,
    hasPhoto: false,
    sun: "part-sun",
    soil: "clay",
    drainage: "average",
    hasPetsOrKids: false,
  },
  "low-maintenance-backyard": {
    regionId: "us-midwest-chicago",
    goal: "low-maintenance",
    budget: 700,
    effortLevel: "light",
    areaType: "lawn-corner",
    areaSqft: 160,
    hasPhoto: false,
    sun: "full-sun",
    soil: "unknown",
    drainage: "unknown",
  },
  "privacy-side-yard": {
    regionId: "niagara-southern-ontario",
    goal: "privacy",
    budget: 1200,
    effortLevel: "moderate",
    areaType: "fence-line",
    areaSqft: 120,
    hasPhoto: false,
    sun: "full-sun",
    soil: "loam",
    drainage: "well-drained",
  },
  "pet-safe-front-yard": {
    regionId: "us-northeast-boston",
    goal: "curb-appeal",
    budget: 800,
    effortLevel: "moderate",
    areaType: "front-walkway",
    areaSqft: 100,
    hasPhoto: false,
    sun: "full-sun",
    soil: "unknown",
    drainage: "unknown",
    hasPetsOrKids: true,
  },
};

export const DEMO_FIXTURE_KEY = "oakville-front-yard";
