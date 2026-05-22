// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { generateDeterministicPlan } from "@/domain";
import { FIXTURES } from "@/domain";
import type { BloomprintPlan } from "@/domain/models";
import { PlanResult, type ViewMode } from "@/components/PlanResult";

// Build a real deterministic plan (source of truth, no AI) the same way the
// /api/plan pipeline does, then wrap it as a BloomprintPlan envelope.
// The low-maintenance fixture leaves soil + drainage "unknown", which yields
// accuracy upgrades — exercising the "make it more accurate" card.
function demoPlan(fixtureKey = "low-maintenance-backyard"): BloomprintPlan {
  const plan = generateDeterministicPlan(FIXTURES[fixtureKey]);
  return {
    plan,
    enhancement: null,
    enhancedBy: "none",
    generatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
  };
}

function renderPlan(view: ViewMode = "simple", locale: "en" | "zh" = "en") {
  return renderWithIntl(
    <PlanResult
      result={demoPlan()}
      view={view}
      adjustments={[]}
      busy={false}
      onRefine={vi.fn()}
      onAccuracy={vi.fn()}
    />,
    { locale },
  );
}

describe("PlanResult", () => {
  it("renders core section headings in English", () => {
    renderPlan("simple", "en");
    expect(screen.getByRole("heading", { name: "Budget" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plants" })).toBeInTheDocument();
  });

  it("renders core section headings in Chinese", () => {
    renderPlan("simple", "zh");
    expect(screen.getByRole("heading", { name: "预算" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "植物" })).toBeInTheDocument();
  });

  it("renders the sticky section nav with localized items", () => {
    renderPlan("simple", "en");
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("link", { name: "Summary" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Plants" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Store" })).toBeInTheDocument();
  });

  it("renders the accuracy upgrade card when site fields are unknown", () => {
    renderPlan("simple", "en");
    expect(
      screen.getByRole("heading", { name: "Make this more accurate" }),
    ).toBeInTheDocument();
  });

  it("renders the staff helper section only in staff view", () => {
    const { unmount } = renderPlan("simple", "en");
    expect(screen.queryByRole("heading", { name: "Staff helper" })).not.toBeInTheDocument();
    unmount();

    renderPlan("staff", "en");
    expect(screen.getByRole("heading", { name: "Staff helper" })).toBeInTheDocument();
    // The staff nav item appears only in staff view.
    const nav = screen.getByRole("navigation");
    expect(within(nav).getByRole("link", { name: "Staff" })).toBeInTheDocument();
  });
});
