"use client";

import { Link } from "@/i18n/navigation";
import { initials, useAccount } from "@/lib/accountStore";
import { useSavedPlans } from "@/lib/plansStore";
import { CloudSyncCard } from "@/components/CloudSyncCard";
import { BillingStatus } from "@/components/billing/BillingStatus";

export default function AccountPage() {
  const account = useAccount();
  const plans = useSavedPlans();

  if (!account) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="card animate-fade-up p-8 text-center">
          <p className="font-medium text-foreground">You don&apos;t have an account yet</p>
          <p className="mt-1 text-sm text-muted">Create one to keep your profile and saved plans together.</p>
          <Link
            href="/signup"
            className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong"
          >
            Create account
          </Link>
        </div>
        <div className="mt-4">
          <CloudSyncCard />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-fade-up px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-lg font-semibold text-on-strong">
          {initials(account.name) || "🌱"}
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hi, {account.name}</h1>
          <p className="text-sm text-muted">
            {account.email ? `${account.email} · ` : ""}Member since{" "}
            {new Date(account.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/plans" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-2xl font-semibold text-foreground">{plans.length}</p>
          <p className="text-sm text-muted">saved {plans.length === 1 ? "plan" : "plans"} — open &amp; compare</p>
        </Link>
        <Link href="/plan" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-2xl font-semibold text-brand">＋</p>
          <p className="text-sm text-muted">Start a new yard plan</p>
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/account/settings"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-brand"
        >
          Account settings
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <CloudSyncCard />
        <BillingStatus />
      </div>

      <p className="mt-6 text-xs text-muted">
        Your account and plans save on this device. Signing in to cloud sync keeps them across your devices.
      </p>
    </main>
  );
}
