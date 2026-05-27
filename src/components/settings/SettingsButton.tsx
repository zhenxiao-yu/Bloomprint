"use client";

import { Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { SettingsDialog } from "@/components/settings/SettingsDialog";

/**
 * The single navbar entry point for device preferences — replaces the standalone
 * theme + language buttons. A gear that opens the full settings modal.
 */
export function SettingsButton({ className = "" }: { className?: string }) {
  const t = useTranslations("SettingsModal");
  return (
    <SettingsDialog>
      <button
        type="button"
        aria-label={t("open")}
        title={t("open")}
        className={`group relative flex size-9 items-center justify-center rounded-full border border-border text-muted outline-none transition hover:border-brand hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${className}`}
      >
        <Settings2
          className="size-4 transition-transform duration-500 group-hover:rotate-90"
          aria-hidden
        />
      </button>
    </SettingsDialog>
  );
}
