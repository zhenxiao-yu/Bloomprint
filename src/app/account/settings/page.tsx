"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut, updateAccount, useAccount } from "@/lib/accountStore";
import { clearPlans, useSavedPlans } from "@/lib/plansStore";

export default function SettingsPage() {
  const router = useRouter();
  const account = useAccount();
  const plans = useSavedPlans();
  const [saved, setSaved] = useState(false);

  // Redirect when there's no account (navigation only — no setState in this effect).
  useEffect(() => {
    if (!account) router.replace("/signup");
  }, [account, router]);

  if (!account) return null;

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "");
    if (!name) return;
    updateAccount({ name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 animate-fade-up px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/account" className="text-sm font-semibold text-brand">
        ← Account
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-foreground">Settings</h1>

      <form onSubmit={save} className="card mt-5 space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">Name</span>
          <input name="name" defaultValue={account.name} required className="card w-full p-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-foreground">
            Email <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="email"
            type="email"
            defaultValue={account.email ?? ""}
            className="card w-full p-2.5 text-sm"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
          >
            Save changes
          </button>
          {saved ? <span className="text-xs font-medium text-brand-strong">✓ Saved</span> : null}
        </div>
      </form>

      <div className="card mt-4 space-y-3 p-5">
        <h2 className="text-base font-semibold text-foreground">Your data</h2>
        <p className="text-sm text-muted">
          You have {plans.length} saved {plans.length === 1 ? "plan" : "plans"} on this device.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (confirm("Delete all saved plans on this device? This can't be undone.")) clearPlans();
            }}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground transition hover:border-[var(--danger)]"
          >
            Clear saved plans
          </button>
          <button
            onClick={() => {
              if (confirm("Sign out and remove this device account? Saved plans stay on the device.")) {
                signOut();
                router.push("/");
              }
            }}
            className="rounded-full border border-border px-4 py-2 text-sm text-[var(--danger)] transition hover:border-[var(--danger)]"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
