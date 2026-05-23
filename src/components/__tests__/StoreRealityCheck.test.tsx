// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import { StoreSearch } from "@/domain/models";
import { StoreRealityResult } from "@/lib/live-data/schema";
import { StoreRealityCheck } from "@/components/StoreRealityCheck";

const searches = [
  StoreSearch.parse({ name: "Emerald Cedar", query: "Emerald Cedar", availability: "needs-local-check" }),
];

const live = [
  StoreRealityResult.parse({
    canonicalItemId: "Emerald Cedar",
    canonicalName: "Emerald Cedar",
    searchTerms: ["Emerald Cedar"],
    matches: [
      {
        retailer: "Home Depot",
        productTitle: "Search “Emerald Cedar”",
        productUrl: "https://www.homedepot.com/s/Emerald%20Cedar",
        price: { min: 40, max: 90 },
        availabilityLabel: "verify_locally",
        source: { name: "Bloomprint estimate", sourceType: "retailer-cost", level: 5, needsLocalVerification: true },
        lastCheckedAt: new Date().toISOString(),
      },
    ],
    priceRange: { low: 40, high: 90, currency: "CAD", confidence: "medium" },
    confidence: "medium",
    lastCheckedAt: new Date().toISOString(),
  }),
];

describe("StoreRealityCheck", () => {
  it("renders live price estimate, estimate badge, and the honesty disclaimer (en)", () => {
    renderWithIntl(<StoreRealityCheck searches={searches} live={live} />);
    expect(screen.getByText(/\$40–\$90/)).toBeInTheDocument(); // estimate range value (unique)
    expect(screen.getByText("Estimate")).toBeInTheDocument(); // source badge (exact)
    expect(screen.getByText(/not stock, aisle, or final-price claims/i)).toBeInTheDocument();
  });

  it("localizes labels under the zh locale", () => {
    renderWithIntl(<StoreRealityCheck searches={searches} live={live} />, { locale: "zh" });
    expect(screen.getByText(/\$40–\$90/)).toBeInTheDocument();
    expect(screen.getByText("估算")).toBeInTheDocument(); // badge (exact; not the "价格估算" label)
  });

  it("still renders deterministically with no live data", () => {
    renderWithIntl(<StoreRealityCheck searches={searches} />);
    expect(screen.getByText("Emerald Cedar")).toBeInTheDocument();
    expect(screen.queryByText(/\$40–\$90/)).not.toBeInTheDocument(); // no live price estimate
  });

  it("shows Canadian retailers for an Ontario region plus the verify-before-buying warning", () => {
    renderWithIntl(<StoreRealityCheck searches={searches} regionId="gta-ontario" />);
    expect(screen.getByText("Home Depot Canada")).toBeInTheDocument();
    expect(screen.getByText("Canadian Tire")).toBeInTheDocument();
    expect(screen.getByText(/can't guarantee live stock or final checkout price/i)).toBeInTheDocument();
    // Never claims live stock / final price.
    expect(screen.queryByText(/in stock/i)).not.toBeInTheDocument();
  });

  it("shows US retailers for a us-* region", () => {
    renderWithIntl(<StoreRealityCheck searches={searches} regionId="us-midwest-chicago" />);
    expect(screen.getByText("Home Depot")).toBeInTheDocument();
    expect(screen.getByText("Lowe's")).toBeInTheDocument();
  });
});
