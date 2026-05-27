// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { ThemeToggle } from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a button (mount-gated, becomes interactive after effect)", async () => {
    renderWithIntl(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // After mount the trigger's aria-label reflects the current theme.
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toMatch(/Theme:/);
    });
  });

  it("labels the trigger with the current theme (default: System)", async () => {
    renderWithIntl(<ThemeToggle />);
    const button = screen.getByRole("button");
    // Default theme is "system"; the dropdown trigger announces it.
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toBe("Theme: System");
    });
  });

  it("renders Chinese theme labels under the zh locale", async () => {
    renderWithIntl(<ThemeToggle />, { locale: "zh" });
    const button = screen.getByRole("button");
    await waitFor(() => {
      // zh: System -> 跟随系统 (contains 系统)
      expect(button.getAttribute("aria-label")).toContain("系统");
    });
  });
});
