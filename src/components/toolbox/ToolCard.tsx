import type { LucideIcon } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";

/** A tappable tool tile linking to /toolbox/<slug>. Mobile-first; whole card is the link. */
export function ToolCard({
  slug,
  title,
  intro,
  icon: Icon,
  categoryLabel,
}: {
  slug: string;
  title: string;
  intro: string;
  icon: LucideIcon;
  categoryLabel: string;
}) {
  return (
    <Link
      href={`/toolbox/${slug}`}
      className="group flex min-h-11 flex-col gap-2 rounded-2xl border border-border bg-surface p-4 outline-none transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:scale-105">
          <Icon className="size-5" aria-hidden />
        </span>
        <Badge variant="secondary" className="shrink-0 text-[11px]">
          {categoryLabel}
        </Badge>
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="line-clamp-2 text-sm text-muted-foreground">{intro}</p>
    </Link>
  );
}
