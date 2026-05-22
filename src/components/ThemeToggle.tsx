"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

const ORDER = ["light", "dark", "system"] as const;
type Choice = (typeof ORDER)[number];

const META: Record<Choice, { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: "Light" },
  dark: { icon: Moon, label: "Dark" },
  system: { icon: Monitor, label: "System" },
};

/**
 * Compact theme cycle button: Light → Dark → System.
 * Renders a stable placeholder until mounted to avoid hydration mismatch.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mount gate prevents hydration mismatch (server can't know the resolved theme).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const current: Choice = (mounted && ORDER.includes(theme as Choice) ? (theme as Choice) : "system");
  const Icon = META[current].icon;
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${META[current].label}. Switch to ${META[next].label}.`}
      title={`Theme: ${META[current].label}`}
      className={`flex size-9 items-center justify-center rounded-full border border-border text-muted transition hover:border-brand hover:text-foreground ${className}`}
    >
      {mounted ? <Icon className="size-4" aria-hidden /> : <span className="size-4" />}
    </button>
  );
}
