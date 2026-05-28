"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { getToolEntry } from "@/lib/toolbox/registry";

/**
 * Renders a single tool on its `/toolbox/[slug]` page: the icon + title + intro header, then
 * the code-split calculator inside a Suspense boundary. Keeps the route a server component
 * (this client wrapper owns the lazy() rendering). Title/intro come from `Tools.<slug>`.
 */
export function ToolRunner({ slug }: { slug: string }) {
  const entry = getToolEntry(slug);
  const t = useTranslations(`Tools.${slug}`);
  if (!entry) return null;
  const { Component, icon: Icon } = entry;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="title-1 text-foreground">{t("title")}</h1>
          <p className="mt-1 text-base text-muted-foreground">{t("intro")}</p>
        </div>
      </header>
      <Suspense
        fallback={
          <div
            className="w-full animate-pulse rounded-2xl border border-dashed border-border bg-surface-muted/40"
            style={{ minHeight: "18rem" }}
          />
        }
      >
        <Component />
      </Suspense>
    </div>
  );
}
