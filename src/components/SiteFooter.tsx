import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";

import { Link } from "@/i18n/navigation";

const FOOTER_NAV = [
  { href: "/plan", key: "plan" },
  { href: "/plans", key: "saved" },
  { href: "/pro", key: "pro" },
  { href: "/pricing", key: "pricing" },
  { href: "/guide", key: "guide" },
  { href: "/about", key: "about" },
] as const;

export function SiteFooter() {
  const t = useTranslations("Footer");
  const tNav = useTranslations("Nav");
  const year = 2026;

  return (
    <footer className="no-print relative mt-12 overflow-hidden border-t border-border bg-surface/40">
      {/* Subtle brand wash + hairline keep the footer grounded without shouting. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-brand/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="group inline-flex items-center gap-2 font-display font-semibold text-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface">
              <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-strong text-xs font-bold text-on-strong shadow-sm transition group-hover:scale-105">
                BP
              </span>
              <span className="text-base tracking-tight">Bloomprint</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted">{t("tagline")}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2.5 text-sm sm:grid-cols-3 md:grid-cols-2">
            {FOOTER_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="w-fit rounded text-muted outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50"
              >
                {tNav(n.key)}
              </Link>
            ))}
            <a
              href="https://github.com/zhenxiao-yu/Bloomprint"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex w-fit items-center gap-1 rounded text-muted outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              {t("github")}
              <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl leading-relaxed">{t("disclaimer")}</p>
          <p className="shrink-0 numeric text-muted/80">© {year} Bloomprint</p>
        </div>
      </div>
    </footer>
  );
}
