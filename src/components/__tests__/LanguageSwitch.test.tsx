// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";

// LanguageSwitch reaches into the next-intl navigation + next/navigation
// request context. Stub them with lightweight no-ops so the component renders
// in isolation; the behaviour under test is the trigger's localized label.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({}),
}));

import { LanguageSwitch } from "@/components/LanguageSwitch";

describe("LanguageSwitch", () => {
  it("renders a localized language trigger under the English locale", () => {
    renderWithIntl(<LanguageSwitch />, { locale: "en" });
    expect(screen.getByRole("button", { name: "Language" })).toBeInTheDocument();
    // The compact trigger shows the current-locale short tag.
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("renders a localized language trigger under the Chinese locale", () => {
    renderWithIntl(<LanguageSwitch />, { locale: "zh" });
    expect(screen.getByRole("button", { name: "语言" })).toBeInTheDocument();
    expect(screen.getByText("中")).toBeInTheDocument();
  });
});
