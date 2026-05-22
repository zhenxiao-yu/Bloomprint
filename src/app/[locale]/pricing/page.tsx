import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { PricingCards } from "@/components/billing/PricingCards";

export const metadata: Metadata = {
  title: "Pricing — Bloomprint",
  description: "Bloomprint's planning engine is free. Paid tiers add cloud scale, exports, and staff tools.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="animate-fade-up space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">Simple, honest pricing</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted">
            The full planning engine — plans, shopping, install steps, evidence, store reality — is
            <strong> free, forever</strong>. Paid tiers add cloud scale, exports, more AI, and staff
            tools. No paywall on the part that helps you build.
          </p>
        </header>

        <PricingCards />

        <p className="text-center text-xs text-muted">
          Billed monthly, cancel anytime via the customer portal. Prices in USD.{" "}
          <Link href="/about" className="text-brand hover:underline">
            How Bloomprint works
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
