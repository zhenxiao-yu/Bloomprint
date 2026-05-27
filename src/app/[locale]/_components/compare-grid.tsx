"use client";

import { Check, MessageSquareOff, Sparkles, X } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { Reveal } from "@/components/ui/reveal";

/**
 * Compare grid — the anti-chatbot moat as a set of paired cards. Each card
 * contrasts a general chatbot (struck through, danger) against Bloomprint
 * (checked, trust) with a MagicCard pointer glow. All copy is passed in.
 */

type Row = { label: string; them: string; us: string };

export function CompareGrid({
  title,
  subtitle,
  themLabel,
  usLabel,
  rows,
}: {
  title: string;
  subtitle: string;
  themLabel: string;
  usLabel: string;
  rows: readonly Row[];
}) {
  return (
    <section className="page-wide">
    <Reveal
      as="div"
      className="snap-section blueprint-grid rounded-3xl p-6 ring-1 ring-foreground/5 sm:p-10 lg:p-12"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="title-1 text-foreground">{title}</h2>
          <p className="lead mt-2 max-w-2xl">{subtitle}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1.5 text-[13px] font-semibold text-danger">
            <MessageSquareOff className="size-3.5" aria-hidden />
            {themLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-trust/10 px-3 py-1.5 text-[13px] font-semibold text-trust">
            <Sparkles className="size-3.5" aria-hidden />
            {usLabel}
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {rows.map((row) => (
          <MagicCard
            key={row.label}
            gradientFrom="#244735"
            gradientTo="#b87945"
            gradientColor="#244735"
            gradientOpacity={0.12}
            gradientSize={220}
            className="rounded-2xl border border-border bg-surface"
          >
            <div className="flex flex-col gap-3.5 p-6">
              <p className="eyebrow text-muted">{row.label}</p>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-danger/12 text-danger">
                  <X className="size-4" aria-hidden />
                </span>
                <p className="text-base leading-relaxed text-muted line-through decoration-danger/40">
                  <span className="sr-only">{themLabel}: </span>
                  {row.them}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-trust/15 text-trust">
                  <Check className="size-4" aria-hidden />
                </span>
                <p className="text-base font-medium leading-relaxed text-foreground">
                  <span className="sr-only">{usLabel}: </span>
                  {row.us}
                </p>
              </div>
            </div>
          </MagicCard>
        ))}
      </div>
    </Reveal>
    </section>
  );
}
