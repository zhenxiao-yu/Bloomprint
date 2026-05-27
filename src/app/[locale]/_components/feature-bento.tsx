"use client";

import Image from "next/image";
import { CheckCircle2, ClipboardList, ShieldCheck, ShoppingBag } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { Reveal } from "@/components/ui/reveal";

/**
 * Feature bento — an asymmetric grid mixing a photographic hero tile, the four
 * plan deliverables, and a "facts first" trust tile. MagicCard adds a pointer-
 * tracking glow (theme-aware) without inventing any product claims.
 */

type Tile = {
  key: string;
  Icon: React.ElementType;
  title: string;
  body: string;
  className: string;
};

export function FeatureBento({
  eyebrow,
  title,
  subtitle,
  photoCaption,
  items,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  photoCaption: string;
  items: {
    shoppingTitle: string;
    shoppingBody: string;
    orderTitle: string;
    orderBody: string;
    risksTitle: string;
    risksBody: string;
    storeTitle: string;
    storeBody: string;
  };
}) {
  // Spans chosen so the grid tessellates with no holes across breakpoints.
  // lg (4 cols): photo = col1 / rows 1-2; shopping = cols 2-4 / row 1;
  // order + risks fill row 2; store = full-width row 3.
  // sm (3 cols): photo = col1 / rows 1-2; shopping = cols 2-3; etc.
  const tiles: Tile[] = [
    {
      key: "shopping",
      Icon: ClipboardList,
      title: items.shoppingTitle,
      body: items.shoppingBody,
      className: "sm:col-span-2 lg:col-span-3",
    },
    {
      key: "order",
      Icon: CheckCircle2,
      title: items.orderTitle,
      body: items.orderBody,
      className: "lg:col-span-1",
    },
    {
      key: "risks",
      Icon: ShieldCheck,
      title: items.risksTitle,
      body: items.risksBody,
      className: "lg:col-span-2",
    },
    {
      key: "store",
      Icon: ShoppingBag,
      title: items.storeTitle,
      body: items.storeBody,
      className: "sm:col-span-3 lg:col-span-4",
    },
  ];

  return (
    <Reveal as="section" className="snap-section page-wide">
      <p className="eyebrow text-brand">{eyebrow}</p>
      <h2 className="title-1 mt-2 max-w-3xl text-foreground">{title}</h2>
      <p className="lead mt-3 max-w-2xl">{subtitle}</p>

      <div className="mt-10 grid auto-rows-fr grid-cols-1 gap-6 sm:grid-cols-3 lg:grid-cols-4 lg:gap-8">
        {/* Photographic hero tile spanning two rows on desktop */}
        <article className="group relative col-span-1 overflow-hidden rounded-2xl ring-1 ring-foreground/10 sm:row-span-2">
          <div className="img-duotone absolute inset-0">
            <Image
              src="/photos/raised-bed.jpg"
              alt={photoCaption}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 340px"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          </div>
          <div className="img-scrim absolute inset-0" aria-hidden />
          <div className="relative flex h-full min-h-64 flex-col justify-end p-6">
            <p className="text-lg font-semibold text-white drop-shadow-sm">{photoCaption}</p>
          </div>
        </article>

        {tiles.map(({ key, Icon, title: tTitle, body, className }) => (
          <MagicCard
            key={key}
            mode="orb"
            glowFrom="#244735"
            glowTo="#b87945"
            glowSize={360}
            glowOpacity={0.8}
            className={`rounded-2xl border border-border bg-surface ${className}`}
          >
            <div className="flex h-full flex-col gap-2.5 p-6">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="title-3 text-foreground">{tTitle}</p>
              <p className="text-base leading-relaxed text-muted">{body}</p>
            </div>
          </MagicCard>
        ))}
      </div>
    </Reveal>
  );
}
