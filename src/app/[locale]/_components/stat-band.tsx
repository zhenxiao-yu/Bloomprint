"use client";

import { ClipboardList, ListOrdered, ShieldOff } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Reveal } from "@/components/ui/reveal";

/**
 * Stat band — honest, copy-derived figures (no fabricated library counts).
 * Each number is defensible from existing product copy:
 *  - 4 deliverables  = the four plan sections (shopping list / order / risks / store)
 *  - 5 install steps = the snapshot install order "Mark, prep, plant, edge, mulch"
 *  - 0 accounts      = "Works fully — AI and the cloud are optional add-ons"
 */

type Stat = {
  key: string;
  value: number;
  suffix?: string;
  label: string;
  Icon: React.ElementType;
};

export function StatBand({
  heading,
  deliverablesLabel,
  stepsLabel,
  accountsLabel,
}: {
  heading: string;
  deliverablesLabel: string;
  stepsLabel: string;
  accountsLabel: string;
}) {
  const stats: Stat[] = [
    { key: "deliverables", value: 4, label: deliverablesLabel, Icon: ClipboardList },
    { key: "steps", value: 5, label: stepsLabel, Icon: ListOrdered },
    { key: "accounts", value: 0, label: accountsLabel, Icon: ShieldOff },
  ];

  return (
    <section className="page-wide">
      <Reveal
        as="div"
        className="snap-section glass-strong overflow-hidden rounded-3xl px-6 py-10 sm:px-12 sm:py-12"
      >
        <p className="eyebrow text-center text-brand">{heading}</p>
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          {stats.map(({ key, value, suffix, label, Icon }) => (
            <div key={key} className="flex flex-col items-center text-center">
              <span className="mb-2 flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <div className="numeric display-lg text-foreground">
                <NumberTicker value={value} className="text-foreground" />
                {suffix}
              </div>
              <p className="mt-1.5 max-w-[16rem] text-base text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
