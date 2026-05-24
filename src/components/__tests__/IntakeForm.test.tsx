// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { IntakeForm, type IntakeValues } from "@/components/IntakeForm";

describe("IntakeForm", () => {
  it("renders the localized goal question in English", () => {
    renderWithIntl(<IntakeForm onSubmit={vi.fn()} />, { locale: "en" });
    expect(screen.getByText("What do you want to do?")).toBeInTheDocument();
  });

  it("renders the localized goal question in Chinese", () => {
    renderWithIntl(<IntakeForm onSubmit={vi.fn()} />, { locale: "zh" });
    expect(screen.getByText("你想做点什么？")).toBeInTheDocument();
  });

  it("submits with sensible defaults — unknowns never block", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithIntl(<IntakeForm onSubmit={onSubmit} />, { locale: "en" });

    // No field touched: defaults must produce a valid submission.
    await user.click(screen.getByRole("button", { name: "Build my plan" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0] as IntakeValues;
    expect(values.goal).toBe("general");
    expect(values.budget).toBeGreaterThan(0);
    expect(values.budgetStyle).toBe("balanced");
    expect(values.effortLevel).toBe("moderate");
    expect(values.regionId).toBeTruthy();
    expect(values.hasPhoto).toBe(false);
  });

  it("submits the selected goal as a structured value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithIntl(<IntakeForm onSubmit={onSubmit} />, { locale: "en" });

    // The goal button's accessible name includes its label + blurb.
    await user.click(screen.getByRole("button", { name: /Attract bees and butterflies/ }));
    await user.click(screen.getByRole("button", { name: "Build my plan" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0] as IntakeValues;
    expect(values.goal).toBe("pollinator");
  });

  it("lets the user choose a project scope", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithIntl(<IntakeForm onSubmit={onSubmit} />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Fix one spot" }));
    await user.click(screen.getByRole("button", { name: "Build my plan" }));

    const values = onSubmit.mock.calls[0][0] as IntakeValues;
    expect(values.scope).toBe("spot_fix");
  });

  it("pre-fills the goal when a problem chip is chosen (problem language → goal)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithIntl(<IntakeForm onSubmit={onSubmit} />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: "Privacy gap" }));
    await user.click(screen.getByRole("button", { name: "Build my plan" }));

    const values = onSubmit.mock.calls[0][0] as IntakeValues;
    expect(values.problemType).toBe("privacy_gap");
    expect(values.goal).toBe("privacy"); // mapped from the problem
  });

  it("builds a manual measurement from length × width", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithIntl(<IntakeForm onSubmit={onSubmit} />, { locale: "en" });

    await user.click(screen.getByRole("button", { name: /3\. Accuracy/ }));
    await user.type(screen.getByLabelText("Length"), "20");
    await user.type(screen.getByLabelText("Width"), "4");
    await user.click(screen.getByRole("button", { name: "Build my plan" }));

    const values = onSubmit.mock.calls[0][0] as IntakeValues;
    expect(values.measurement).toMatchObject({
      length: 20,
      width: 4,
      unit: "ft",
      source: "manual",
    });
  });

  it("uses confirmable photo context without blocking form submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithIntl(
      <IntakeForm
        onSubmit={onSubmit}
        photoCount={1}
        photoAnalysis={{
          zones: [
            { id: "front-bed", label: "Front planting bed", type: "planting_bed", confidence: 0.7 },
          ],
          detectedObjects: ["photo ML observation: front bed visible"],
          assumptions: [
            {
              id: "sun",
              label: "Sun exposure",
              value: "Photo ML estimates some sun. Please confirm before buying plants.",
              confidence: "medium",
              editable: true,
            },
          ],
          missingInfo: [],
          risks: [],
          confidence: 0.7,
          generatedAt: Date.now(),
        }}
      />,
      { locale: "en" },
    );

    expect(screen.getByText("Photo intelligence")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apply photo hints" }));
    await user.click(screen.getByRole("button", { name: "Build my plan" }));

    const values = onSubmit.mock.calls[0][0] as IntakeValues;
    expect(values.hasPhoto).toBe(true);
    expect(values.sun).toBe("part-sun");
    expect(values.areaType).toBe("foundation-bed");
  });
});
