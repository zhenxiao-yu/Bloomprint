// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render";
import {
  AssumptionBadge,
  ConfidenceBadge,
  VerificationBadge,
  verificationFromSource,
} from "@/components/plan/TrustBadges";

describe("ConfidenceBadge", () => {
  it("labels the confidence level", () => {
    renderWithIntl(<ConfidenceBadge level="high" />);
    expect(screen.getByText("Confidence: High")).toBeInTheDocument();
  });
  it("renders the low level too", () => {
    renderWithIntl(<ConfidenceBadge level="low" />);
    expect(screen.getByText("Confidence: Low")).toBeInTheDocument();
  });
});

describe("AssumptionBadge", () => {
  it("defaults to the localized label and accepts an override", () => {
    const { rerender } = renderWithIntl(<AssumptionBadge />);
    expect(screen.getByText("Assumption")).toBeInTheDocument();
    rerender(<AssumptionBadge label="Full sun assumed" />);
    expect(screen.getByText("Full sun assumed")).toBeInTheDocument();
  });
});

describe("VerificationBadge", () => {
  it("renders each verification status", () => {
    const { rerender } = renderWithIntl(<VerificationBadge status="verified" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    rerender(<VerificationBadge status="needs-verification" />);
    expect(screen.getByText("Verify locally")).toBeInTheDocument();
    rerender(<VerificationBadge status="estimate" />);
    expect(screen.getByText("Estimate")).toBeInTheDocument();
  });
});

describe("verificationFromSource", () => {
  it("maps a source ref to a status (verified > needs-verification > estimate)", () => {
    expect(verificationFromSource({ verifiedAt: "2026-01-01" })).toBe("verified");
    expect(verificationFromSource({ needsLocalVerification: true })).toBe("needs-verification");
    expect(verificationFromSource({})).toBe("estimate");
    // verifiedAt wins over needsLocalVerification.
    expect(verificationFromSource({ verifiedAt: "x", needsLocalVerification: true })).toBe("verified");
  });
});
