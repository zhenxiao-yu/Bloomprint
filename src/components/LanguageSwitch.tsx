"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Check, Languages } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_LABELS: Record<string, string> = { en: "English", zh: "中文" };

/**
 * Language picker (English / 中文) as a shadcn DropdownMenu with an active check.
 * Preserves the current path + dynamic params across the locale switch.
 */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("Language");

  function switchTo(target: string) {
    if (target === locale) return;
    // Pass current route params through so dynamic segments survive the switch.
    router.replace(
      // @ts-expect-error -- pathname + params is the documented next-intl pattern
      { pathname, params },
      { locale: target },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("label")}
        title={t("label")}
        className={`group flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted outline-none transition hover:border-brand hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-[state=open]:border-brand data-[state=open]:text-foreground ${className}`}
      >
        <Languages className="size-4 transition-transform duration-300 group-hover:rotate-6 group-data-[state=open]:rotate-6" aria-hidden />
        <span aria-hidden>{locale === "zh" ? "中" : "EN"}</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-40 rounded-xl border-border bg-surface/95 backdrop-blur-xl">
        <DropdownMenuLabel className="eyebrow px-2 py-1.5 text-muted">{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {routing.locales.map((loc) => {
          const active = loc === locale;
          return (
            <DropdownMenuItem
              key={loc}
              onSelect={() => switchTo(loc)}
              aria-current={active ? "true" : undefined}
              lang={loc}
              className={`cursor-pointer gap-2.5 rounded-lg ${active ? "text-brand-strong" : "text-foreground"}`}
            >
              <span className="font-medium">{LOCALE_LABELS[loc] ?? loc}</span>
              {active ? <Check className="ml-auto size-4 text-brand" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const SUPPORTED_LOCALES = routing.locales;
