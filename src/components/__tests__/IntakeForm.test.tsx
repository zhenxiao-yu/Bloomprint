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
});
