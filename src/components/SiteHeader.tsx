"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { initials, signOut, useAccount } from "@/lib/accountStore";
import { Link, usePathname } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";

const NAV = [
  { href: "/dashboard", key: "dashboard" },
  { href: "/plan", key: "plan" },
  { href: "/plans", key: "saved" },
  { href: "/pro", key: "pro" },
  { href: "/pricing", key: "pricing" },
  { href: "/guide", key: "guide" },
  { href: "/about", key: "about" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const account = useAccount();
  const t = useTranslations("Nav");
  const [scrolled, setScrolled] = useState(false);

  // Scroll-aware elevation: the header firms up (more opaque + a soft shadow)
  // once the page scrolls, the way native apps lift a top bar over content.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-border bg-surface/80 shadow-[0_8px_30px_-18px_rgba(0,0,0,0.45)]"
          : "border-transparent bg-surface/60"
      }`}
    >
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-brand transition active:scale-95"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-xs font-bold text-on-strong shadow-sm">
            BP
          </span>
          <span className="text-base">Bloomprint</span>
        </Link>

        {/* Primary nav is hidden on mobile — the fixed bottom MobileNav carries it there. */}
        <nav className="ml-2 hidden items-center gap-1 text-sm sm:flex">
          {NAV.map((n) => {
            const href = n.href as string;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-full px-2.5 py-1.5 transition sm:px-3 ${
                  active ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-foreground"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden md:inline-flex">
            <SyncStatusBadge />
          </span>
          <LanguageSwitch />
          <ThemeToggle />
          {account ? (
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 transition hover:border-brand">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-on-strong">
                  {initials(account.name) || "🌱"}
                </span>
                <span className="hidden max-w-[8rem] truncate text-sm text-foreground sm:inline">{account.name}</span>
              </summary>
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                <Link href="/account" className="block px-4 py-2 text-sm text-foreground hover:bg-brand-soft">
                  {t("account")}
                </Link>
                <Link href="/account/settings" className="block px-4 py-2 text-sm text-foreground hover:bg-brand-soft">
                  {t("settings")}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block w-full px-4 py-2 text-left text-sm text-[var(--danger)] hover:bg-brand-soft"
                >
                  {t("signOut")}
                </button>
              </div>
            </details>
          ) : (
            <Link
              href="/signup"
              className="rounded-full bg-brand px-3 py-1.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong sm:px-4"
            >
              <span className="sm:hidden">{t("me")}</span>
              <span className="hidden sm:inline">{t("createAccount")}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
