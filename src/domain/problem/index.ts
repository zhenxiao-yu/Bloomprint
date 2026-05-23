/**
 * Problem-language layer (CLAUDE.md UX principle: "problem language, not landscaping taxonomy").
 *
 * This is additive and presentation-facing only: a {@link ProblemType} maps to an existing
 * {@link ProjectGoal} so the intake UI can offer plain-language chips that *pre-fill* the goal.
 * The deterministic engine still reasons over `intake.goal` — never over `problemType`.
 */
import type { InputCaptureType, ProblemType, ProjectGoal, YardIntake } from "@/domain/models";

/** Each user-described problem maps to exactly one engine goal. */
export const PROBLEM_TO_GOAL: Record<ProblemType, ProjectGoal> = {
  dead_plants: "general",
  empty_bed: "curb-appeal",
  overgrown: "low-maintenance",
  privacy_gap: "privacy",
  muddy_erosion: "general",
  boring_curb: "curb-appeal",
  too_much_upkeep: "low-maintenance",
  shady_bare_spot: "shade-tolerant",
};

export function mapProblemToGoal(problem: ProblemType): ProjectGoal {
  return PROBLEM_TO_GOAL[problem];
}

/**
 * How we learned about the space. Derived from the intake (never stored) so the result can label
 * measurement confidence honestly. Order of precedence: AR scan → photo → manual dims → none.
 */
export function deriveInputCapture(intake: YardIntake): InputCaptureType {
  if (intake.measurement?.source === "ar_scan") return "ar_scan";
  if (intake.hasPhoto) return "photo";
  if (intake.measurement) return "manual_dimensions";
  return "no_photo";
}
