"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Check, Monitor, Moon, Sun } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ORDER = ["light", "dark", "system"] as const;
type Choice = (typeof ORDER)[number];

const ICONS: Record<Choice, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

/**
 * Theme picker: a shadcn DropdownMenu (Light / Dark / System) with an active check.
 * Preserves next-themes `setTheme` behavior and renders a stable placeholder until
 * mounted to avoid hydration mismatch (the server can't know the resolved theme).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("Theme");
  const [mounted, setMounted] = useState(false);

  // Mount gate prevents hydration mismatch (server can't know the resolved theme).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const current: Choice = mounted && ORDER.includes(theme as Choice) ? (theme as Choice) : "system";
  const TriggerIcon = ICONS[current];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("title", { current: t(current) })}
        title={t("title", { current: t(current) })}
        className={`group relative flex size-9 items-center justify-center rounded-full border border-border text-muted outline-none transition hover:border-brand hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface data-[state=open]:border-brand data-[state=open]:text-foreground ${className}`}
      >
        {mounted ? (
          <TriggerIcon className="size-4 transition-transform duration-300 group-hover:rotate-12 group-data-[state=open]:rotate-12" aria-hidden />
        ) : (
          <span className="size-4" />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-40 rounded-xl border-border bg-surface/95 backdrop-blur-xl">
        <DropdownMenuLabel className="eyebrow px-2 py-1.5 text-muted">{t.has("appearance") ? t("appearance") : "Theme"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ORDER.map((choice) => {
          const Icon = ICONS[choice];
          const active = current === choice;
          return (
            <DropdownMenuItem
              key={choice}
              onSelect={() => setTheme(choice)}
              aria-current={active ? "true" : undefined}
              className={`cursor-pointer gap-2.5 rounded-lg ${active ? "text-brand-strong" : "text-foreground"}`}
            >
              <Icon className={`size-4 ${active ? "text-brand" : ""}`} aria-hidden />
              <span className="font-medium">{t(choice)}</span>
              {active ? <Check className="ml-auto size-4 text-brand" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
