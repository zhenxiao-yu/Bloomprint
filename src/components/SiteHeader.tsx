"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials, signOut, useAccount } from "@/lib/accountStore";

const NAV = [
  { href: "/plan", label: "Plan" },
  { href: "/plans", label: "Saved" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const account = useAccount();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-brand">
          <span className="text-lg">🌿</span>
          <span className="hidden sm:inline">Bloomprint</span>
        </Link>

        <nav className="ml-2 flex items-center gap-1 text-sm">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-3 py-1.5 transition ${
                  active ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-foreground"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto">
          {account ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 transition hover:border-brand">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {initials(account.name) || "🌱"}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm text-foreground sm:inline">{account.name}</span>
              </summary>
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                <Link href="/account" className="block px-4 py-2 text-sm text-foreground hover:bg-brand-soft">
                  Account
                </Link>
                <Link href="/account/settings" className="block px-4 py-2 text-sm text-foreground hover:bg-brand-soft">
                  Settings
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block w-full px-4 py-2 text-left text-sm text-[var(--danger)] hover:bg-brand-soft"
                >
                  Sign out
                </button>
              </div>
            </details>
          ) : (
            <Link
              href="/signup"
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-strong"
            >
              Create account
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
