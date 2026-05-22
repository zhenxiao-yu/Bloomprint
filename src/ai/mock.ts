/**
 * Mock provider — the default. Deterministic, no network, no key. It rephrases the deterministic
 * plan into presentation fields without inventing a single fact, so the full pipeline (and tests)
 * run end-to-end offline.
 */
import { AIPlanEnhancement, type DeterministicPlan } from "@/domain/models";
import type { AIProvider } from "@/ai/provider";

function goalWord(goal: DeterministicPlan["intake"]["goal"]): string {
  switch (goal) {
    case "privacy":
      return "Privacy Screen";
    case "curb-appeal":
      return "Curb Appeal";
    case "low-maintenance":
      return "Easy-Care Refresh";
    case "pollinator":
      return "Pollinator Garden";
    case "shade-tolerant":
      return "Shade Garden";
    default:
      return "Yard Refresh";
  }
}

function topPlantNames(plan: DeterministicPlan, n: number): string[] {
  return [...plan.plants]
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, n)
    .map((p) => p.commonName);
}

function money(min: number, max: number): string {
  return `$${min}–$${max}`;
}

export class MockProvider implements AIProvider {
  readonly name = "mock" as const;

  async enhancePlan(plan: DeterministicPlan): Promise<AIPlanEnhancement | null> {
    const concept = `${plan.styleLabel} ${goalWord(plan.intake.goal)}`;
    const headliners = topPlantNames(plan, 3);
    const diy = plan.budget.diyTotal;

    const enhancement = {
      conceptName: concept,
      homeownerExplanation:
        `${plan.narrative} ${plan.insight} Expect to spend roughly ` +
        `${money(diy.min, diy.max)} on the build and ${plan.visualSummary.expectedEffort.toLowerCase()}.`,
      refinedNarrative: `Picture a ${plan.styleLabel.toLowerCase()} bed anchored by ${
        headliners[0] ?? "structural plants"
      }, layered down to a tidy mulched edge — ${plan.visualSummary.whatChangesVisually
        .map((s) => s.toLowerCase())
        .join(", ")}.`,
      staffTalkingPoints: [
        `Concept: ${concept} for about ${money(diy.min, diy.max)} in materials and plants.`,
        `Lead with ${headliners.join(", ")} — they scored highest for this yard.`,
        plan.risks[0]
          ? `Mention: ${plan.risks[0].message} (${plan.risks[0].mitigation})`
          : "No major site risks flagged — a straightforward install.",
        "Offer path lighting as an easy add-on once the bed is in.",
      ],
      alternatives: [
        "Good: plant the Buy First list now and add Optional upgrades later.",
        "Better: include the decorative stone and edging for a cleaner finished look.",
        "Best: add low-voltage lighting to extend the bed into the evening.",
      ],
      imagePrompt: `A ${plan.styleLabel.toLowerCase()} suburban ${plan.intake.areaType?.replace(
        /-/g,
        " ",
      )} planting bed featuring ${headliners.join(", ")}, clean mulched edge, photorealistic, daytime.`,
      whyNot: [
        "We avoided overcrowding so the bed still looks clean as plants mature.",
        plan.intake.goal === "low-maintenance"
          ? "We skipped fussier flowering shrubs to keep upkeep genuinely low."
          : "We kept the species count focused so it reads as one intentional design.",
      ],
      simplifiedSummary: `${concept}: ${plan.plants.length} plant types, ${money(
        diy.min,
        diy.max,
      )} to build, ${plan.visualSummary.expectedEffort.toLowerCase()}.`,
    };

    const parsed = AIPlanEnhancement.safeParse(enhancement);
    return parsed.success ? parsed.data : null;
  }
}
