"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Compact language toggle (English ⇄ 中文) that preserves the current path.
 */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  const next = locale === "zh" ? "en" : "zh";

  function switchTo() {
    // Pass current route params through so dynamic segments survive the switch.
    router.replace(
      // @ts-expect-error -- pathname + params is the documented next-intl pattern
      { pathname, params },
      { locale: next },
    );
  }

  return (
    <button
      type="button"
      onClick={switchTo}
      aria-label={`Switch language to ${next === "zh" ? "中文" : "English"}`}
      className={`flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted transition hover:border-brand hover:text-foreground ${className}`}
    >
      <Languages className="size-4" aria-hidden />
      <span>{next === "zh" ? "中文" : "EN"}</span>
    </button>
  );
}

export const SUPPORTED_LOCALES = routing.locales;
