"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { ChevronDown, LogOut, Plus, Settings, UserRound } from "lucide-react";

import { initials, useAccount } from "@/lib/accountStore";
import { signOutEverywhere } from "@/lib/supabase/signOutEverywhere";
import { Link, usePathname } from "@/i18n/navigation";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import { BorderBeam } from "@/components/ui/border-beam";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// The working surface stays inline; business + info pages tuck into a "More"
// overflow so the bar reads as one calm row instead of eight flat links.
const PRIMARY_NAV = [
  { href: "/plans", key: "myPlans" },
  { href: "/toolbox", key: "toolbox" },
] as const;

const MORE_NAV = [
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
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = MORE_NAV.some((n) => isActive(n.href));

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
      className={`no-print sticky top-0 z-30 border-b backdrop-blur-xl transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-border bg-surface/80 shadow-[0_10px_34px_-20px_color-mix(in_srgb,var(--brand-strong)_70%,transparent)]"
          : "border-transparent bg-surface/55"
      }`}
    >
      {/* Hairline brand gradient that brightens once the bar lifts off content. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent transition-opacity duration-300 ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="page-wide flex h-16 items-center gap-3">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2 rounded-full font-display font-semibold text-brand outline-none transition focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95"
        >
          <span className="relative flex size-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-strong text-xs font-bold text-on-strong shadow-sm transition group-hover:shadow-[0_6px_18px_-6px_color-mix(in_srgb,var(--brand-strong)_80%,transparent)]">
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            BP
          </span>
          <span className="title-3 text-base tracking-tight">Bloomprint</span>
        </Link>

        {/* Primary nav is hidden on mobile — the fixed bottom MobileNav carries it there. */}
        <nav className="ml-3 hidden items-center gap-1 text-base lg:gap-1.5 sm:flex">
          {PRIMARY_NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`group relative inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50 ${
                  active ? "text-brand-strong" : "text-muted hover:text-foreground"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="nav-active-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 -z-10 rounded-full bg-brand-soft"
                  />
                ) : (
                  <span className="absolute inset-0 -z-10 scale-90 rounded-full bg-foreground/[0.04] opacity-0 transition group-hover:scale-100 group-hover:opacity-100" />
                )}
                {t(n.key)}
              </Link>
            );
          })}

          {/* Secondary pages (business + info) tuck into a calm overflow menu. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("moreDescription")}
              className={`group relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-full px-3.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50 ${
                moreActive ? "text-brand-strong" : "text-muted hover:text-foreground"
              }`}
            >
              <span
                className={`absolute inset-0 -z-10 rounded-full transition ${
                  moreActive
                    ? "bg-brand-soft"
                    : "scale-90 bg-foreground/[0.04] opacity-0 group-hover:scale-100 group-hover:opacity-100 group-data-[state=open]:scale-100 group-data-[state=open]:opacity-100"
                }`}
              />
              {t("more")}
              <ChevronDown
                className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
                aria-hidden
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-44 rounded-xl border-border bg-surface/95 backdrop-blur-xl"
            >
              {MORE_NAV.map((n) => (
                <DropdownMenuItem key={n.href} asChild className="cursor-pointer rounded-lg">
                  <Link href={n.href} aria-current={isActive(n.href) ? "page" : undefined}>
                    {t(n.key)}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Primary action lives here, not as a nav tab — start a plan from anywhere.
              Mobile uses the bottom nav's Plan tab, so this shows on sm+ only. */}
          <Link
            href="/plan"
            className="hidden items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-semibold text-on-strong shadow-sm outline-none transition hover:bg-brand-strong focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.97] sm:inline-flex"
          >
            <Plus className="size-4" aria-hidden />
            {t("newPlan")}
          </Link>
          <span className="hidden md:inline-flex">
            <SyncStatusBadge />
          </span>
          <SettingsButton />
          {account ? (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger
                    aria-label={t("account")}
                    className="group flex cursor-pointer list-none items-center gap-2 rounded-full border border-border py-1 pl-1 pr-2.5 outline-none transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-[state=open]:border-brand"
                  >
                    {account.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-xs font-semibold text-on-strong">
                        {initials(account.name) || "🌱"}
                      </span>
                    )}
                    <span className="hidden max-w-[8rem] truncate text-sm font-medium text-foreground sm:inline">
                      {account.name}
                    </span>
                    <ChevronDown
                      className="hidden size-3.5 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180 sm:block"
                      aria-hidden
                    />
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("account")}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" sideOffset={8} className="w-52 rounded-xl border-border bg-surface/95 backdrop-blur-xl">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-foreground">{account.name}</span>
                  <span className="truncate text-xs font-normal text-muted">
                    {account.email ?? "Bloomprint"}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg">
                  <Link href="/account">
                    <UserRound className="size-4" aria-hidden />
                    {t("account")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg">
                  <Link href="/account/settings">
                    <Settings className="size-4" aria-hidden />
                    {t("settings")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => void signOutEverywhere()}
                  className="cursor-pointer gap-2.5 rounded-lg"
                >
                  <LogOut className="size-4" aria-hidden />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/signup"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-strong px-3.5 py-1.5 text-sm font-semibold text-on-strong shadow-[0_8px_22px_-12px_color-mix(in_srgb,var(--brand-strong)_85%,transparent)] outline-none transition hover:shadow-[0_12px_28px_-12px_color-mix(in_srgb,var(--brand-strong)_85%,transparent)] focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.97] sm:px-4"
            >
              {/* Subtle sheen sweep on hover keeps the CTA lively without being garish. */}
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative sm:hidden">{t("me")}</span>
              <span className="relative hidden sm:inline">{t("createAccount")}</span>
              <BorderBeam
                size={56}
                duration={5}
                borderWidth={1.4}
                colorFrom="color-mix(in srgb, var(--on-strong) 90%, transparent)"
                colorTo="color-mix(in srgb, var(--brand-soft) 70%, transparent)"
                className="opacity-70"
              />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
