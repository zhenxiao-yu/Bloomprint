"use client";

import { useTranslations } from "next-intl";
import { Home, Sprout, Bookmark, User, LayoutDashboard } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";

const ITEMS = [
  { href: "/", key: "home", icon: Home, exact: true },
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard, exact: false },
  { href: "/plan", key: "plan", icon: Sprout, exact: false },
  { href: "/plans", key: "saved", icon: Bookmark, exact: false },
  { href: "/account", key: "account", icon: User, exact: false },
] as const;

/**
 * Fixed bottom navigation for mobile. Hidden on sm+ where the top header carries
 * navigation. Respects the device safe area inset.
 */
export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, key, icon: Icon, exact }) => {
          const path = href as string;
          const active = exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-medium transition ${
                active ? "text-brand" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {t(key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
