// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { ThemeToggle } from "@/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a button (mount-gated, becomes interactive after effect)", async () => {
    renderWithIntl(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // After mount the aria-label reflects the next theme in the cycle.
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toMatch(/Theme:/);
    });
  });

  it("cycles the theme on click (aria-label advances Light -> Dark -> System)", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ThemeToggle />);
    const button = screen.getByRole("button");

    // Default theme is "system" -> next is "light".
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toBe("Theme: System. Switch to Light.");
    });

    await user.click(button);
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toBe("Theme: Light. Switch to Dark.");
    });

    await user.click(button);
    await waitFor(() => {
      expect(button.getAttribute("aria-label")).toBe("Theme: Dark. Switch to System.");
    });
  });

  it("renders Chinese theme labels under the zh locale", async () => {
    renderWithIntl(<ThemeToggle />, { locale: "zh" });
    const button = screen.getByRole("button");
    await waitFor(() => {
      // zh: System -> 系统, Light -> 浅色
      expect(button.getAttribute("aria-label")).toContain("系统");
    });
  });
});
