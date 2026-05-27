"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";

import {
  TOOL_CATEGORIES,
  TOOL_PERSONAS,
  type ToolCategory,
  type ToolPersona,
} from "@/domain/toolbox/catalog";
import { TOOL_REGISTRY } from "@/lib/toolbox/registry";
import { Input } from "@/components/ui/input";
import { ToolCard } from "@/components/toolbox/ToolCard";
import { cn } from "@/lib/utils";

/** Searchable, persona/category-filterable tool grid. Mobile-first; drives off the registry. */
export function ToolboxIndex() {
  const t = useTranslations("Toolbox");
  const tCat = useTranslations("Toolbox.category");
  const tPersona = useTranslations("Toolbox.persona");
  const tTools = useTranslations("Tools");

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ToolCategory | "all">("all");
  const [persona, setPersona] = useState<ToolPersona | "all">("all");

  const items = useMemo(
    () =>
      TOOL_REGISTRY.map((e) => ({
        slug: e.slug,
        icon: e.icon,
        category: e.category,
        personas: e.personas,
        title: tTools(`${e.slug}.title`),
        intro: tTools(`${e.slug}.intro`),
      })),
    [tTools],
  );

  // Only surface filter chips for values actually present in the catalog.
  const cats = useMemo(() => TOOL_CATEGORIES.filter((c) => items.some((i) => i.category === c)), [items]);
  const personas = useMemo(
    () => TOOL_PERSONAS.filter((p) => items.some((i) => i.personas.includes(p))),
    [items],
  );

  const fuse = useMemo(() => new Fuse(items, { keys: ["title", "intro"], threshold: 0.4 }), [items]);

  const filtered = useMemo(() => {
    let list = q.trim() ? fuse.search(q).map((r) => r.item) : items;
    if (cat !== "all") list = list.filter((i) => i.category === cat);
    if (persona !== "all") list = list.filter((i) => i.personas.includes(persona));
    return list;
  }, [q, cat, persona, fuse, items]);

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-9"
          aria-label={t("searchPlaceholder")}
        />
      </div>

      {/* Persona filter — who the tool is for */}
      {personas.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <Chip active={persona === "all"} onClick={() => setPersona("all")}>
            {t("allFilter")}
          </Chip>
          {personas.map((p) => (
            <Chip key={p} active={persona === p} onClick={() => setPersona(p)}>
              {tPersona(p)}
            </Chip>
          ))}
        </div>
      ) : null}

      {/* Category filter */}
      {cats.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            {t("allFilter")}
          </Chip>
          {cats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {tCat(c)}
            </Chip>
          ))}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <ToolCard
              key={i.slug}
              slug={i.slug}
              title={i.title}
              intro={i.intro}
              icon={i.icon}
              categoryLabel={tCat(i.category)}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-6 text-center text-sm text-muted-foreground">
          {t("noResults")}
        </p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-brand/40",
        active
          ? "border-brand bg-brand text-on-strong"
          : "border-border text-muted-foreground hover:border-brand hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
