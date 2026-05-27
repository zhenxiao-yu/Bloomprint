"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import {
  Bookmark,
  Calculator,
  GraduationCap,
  Home,
  Info,
  LayoutDashboard,
  Menu,
  Sprout,
  Tag,
  User,
  Wrench,
} from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const ITEMS = [
  { href: "/", key: "home", icon: Home, exact: true },
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard, exact: false },
  { href: "/plan", key: "plan", icon: Sprout, exact: false },
  { href: "/plans", key: "saved", icon: Bookmark, exact: false },
  { href: "/account", key: "account", icon: User, exact: false },
] as const;

// Secondary destinations that don't earn a permanent slot in the bottom bar.
const MORE = [
  { href: "/toolbox", key: "toolbox", icon: Calculator },
  { href: "/pro", key: "pro", icon: Wrench },
  { href: "/pricing", key: "pricing", icon: Tag },
  { href: "/guide", key: "guide", icon: GraduationCap },
  { href: "/about", key: "about", icon: Info },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Fixed bottom navigation for mobile. Hidden on sm+ where the top header carries
 * navigation. Respects the device safe-area inset and keeps ≥44px tap targets.
 * A "More" tab opens a drawer with secondary destinations.
 */
export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);

  // Graceful fallback until the central message files add these keys.
  const moreLabel = t.has("more") ? t("more") : "More";
  const moreDescription = t.has("moreDescription")
    ? t("moreDescription")
    : "More places to go in Bloomprint.";

  const moreActive = MORE.some((m) => isActive(pathname, m.href, false));

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/80 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {/* Hairline brand gradient along the top edge for a lifted, premium feel. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/45 to-transparent" />

      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, key, icon: Icon, exact }) => {
          const active = isActive(pathname, href as string, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[0.68rem] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                active ? "text-brand" : "text-muted hover:text-foreground"
              }`}
            >
              <span className="relative flex h-7 w-11 items-center justify-center rounded-full">
                {active ? (
                  <motion.span
                    layoutId="mobilenav-active"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-brand-soft"
                  />
                ) : null}
                <Icon className="relative size-5 transition-transform duration-200 group-active:scale-90" aria-hidden />
              </span>
              {t(key)}
            </Link>
          );
        })}

        {/* More: a drawer of secondary links. */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            aria-label={moreLabel}
            className={`group flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[0.68rem] font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
              moreActive ? "text-brand" : "text-muted hover:text-foreground"
            }`}
          >
            <span className="relative flex h-7 w-11 items-center justify-center rounded-full">
              {moreActive ? (
                <motion.span
                  layoutId="mobilenav-active"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full bg-brand-soft"
                />
              ) : null}
              <Menu className="relative size-5 transition-transform duration-200 group-active:scale-90" aria-hidden />
            </span>
            {moreLabel}
          </DialogTrigger>

          <DialogContent
            showCloseButton
            className="top-auto bottom-0 max-w-md translate-y-0 rounded-t-2xl rounded-b-none border-border bg-surface/95 backdrop-blur-xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <span aria-hidden className="mx-auto mb-1 h-1.5 w-10 rounded-full bg-border" />
            <DialogHeader>
              <DialogTitle className="title-3">{moreLabel}</DialogTitle>
              <DialogDescription className="sr-only">{moreDescription}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              {MORE.map(({ href, key, icon: Icon }) => {
                const active = isActive(pathname, href as string, false);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40 ${
                      active
                        ? "border-brand/40 bg-brand-soft text-brand-strong"
                        : "border-border bg-surface text-foreground hover:border-brand hover:bg-brand-soft/40"
                    }`}
                  >
                    <span className={`flex size-9 items-center justify-center rounded-full ${active ? "bg-brand text-on-strong" : "bg-surface-muted text-muted"}`}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    {t(key)}
                  </Link>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  );
}
