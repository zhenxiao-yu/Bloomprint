"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { createAccount, useAccount } from "@/lib/accountStore";
import { trackEvent } from "@/lib/analytics";

export default function SignupPage() {
  const router = useRouter();
  const account = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (account) router.replace("/account");
  }, [account, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createAccount({ name, email });
    trackEvent("account_created");
    router.push("/account");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted">
          Keeps your profile and saved plans together so future plans are faster. Stored on this
          device — no password needed.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-foreground">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoFocus
              className="card w-full p-2.5 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-foreground">
              Email <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="card w-full p-2.5 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
          >
            Create account
          </button>
        </form>

        <p className="mt-4 text-xs text-muted">
          Prefer not to? You can still{" "}
          <Link href="/plan" className="font-medium text-brand">
            plan without an account
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
