import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Bloomprint",
  description: "How Bloomprint turns yard inspiration into a buildable plan — and the principles behind it.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="animate-fade-up space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-foreground">About Bloomprint</h1>
          <p className="mt-2 text-muted">
            Bloomprint turns yard inspiration into a <strong>buildable plan</strong> — what to buy,
            how much, what tools, in what order, and what can go wrong.
          </p>
        </header>

        <section>
          <h2 className="text-lg font-semibold text-foreground">How it works</h2>
          <ol className="mt-2 space-y-2 text-sm text-foreground">
            <li>1. Tell us your goal, region, budget, and how much work you want to do.</li>
            <li>2. A deterministic engine picks and scores plants, then builds the shopping list, budget, install timeline, and risks.</li>
            <li>3. You refine with one tap (cheaper, easier, more privacy…), save, compare versions, and share.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">What makes it different</h2>
          <ul className="mt-2 space-y-2 text-sm text-foreground">
            <li>
              <strong>The plan is the source of truth, not the AI.</strong> A rules-based engine builds
              every plan and works fully with no AI key. AI only rephrases and illustrates — it never
              invents plants, prices, or facts.
            </li>
            <li>
              <strong>Honest by design.</strong> Prices are ranges, not quotes. Regions and zones are
              shown as “likely / approximate.” Assumptions are surfaced, never hidden.
            </li>
            <li>
              <strong>Useful in the real world.</strong> Grouped “Buy First / Can Wait / Optional”
              shopping, a print-ready store list, weekend install timeline, and calendar care reminders.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Your privacy</h2>
          <p className="mt-2 text-sm text-foreground">
            Your account, profile, and saved plans are stored <strong>on your device</strong>. Share
            links encode a plan&apos;s inputs, not your data. Photos you add stay in your browser and
            are never saved. Analytics is cookieless and counts actions, not people.
          </p>
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/plan" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong">
            Start a plan
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:border-brand"
          >
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
