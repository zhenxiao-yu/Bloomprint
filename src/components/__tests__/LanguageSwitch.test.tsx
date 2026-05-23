// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";

// LanguageSwitch reaches into the next-intl navigation + next/navigation
// request context. Stub them with lightweight no-ops so the component renders
// in isolation; the behaviour under test is the target-language label.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({}),
}));

import { LanguageSwitch } from "@/components/LanguageSwitch";

describe("LanguageSwitch", () => {
  it("shows 中文 as the target when the current locale is English", () => {
    renderWithIntl(<LanguageSwitch />, { locale: "en" });
    expect(screen.getByText("中文")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch language to 中文");
  });

  it("shows EN as the target when the current locale is Chinese", () => {
    renderWithIntl(<LanguageSwitch />, { locale: "zh" });
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "Switch language to English");
  });
});
