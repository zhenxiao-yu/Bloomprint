"use client";

import { useTranslations } from "next-intl";
import type { StoreSearch } from "@/domain/models";
import type { StoreRealityResult } from "@/lib/live-data/schema";
import {
  AVAILABILITY_LABEL,
  homeDepotSearchUrl,
  lowesSearchUrl,
  nearbyGardenCentersUrl,
  webSearchUrl,
} from "@/domain/store";
import { Section } from "@/components/ui";
import { LiveBadge } from "@/components/live/LiveBadge";

function fmtRange(low: number, high: number): string {
  return `$${Math.round(low).toLocaleString()}–$${Math.round(high).toLocaleString()}`;
}

function lastCheckedLabel(iso: string, justNow: string): string {
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return "";
  if (Date.now() - ts < 60_000) return justNow;
  return new Date(ts).toLocaleString();
}

/**
 * Honest in-store help: search links + availability *states*, optionally enriched with
 * live-ish retailer price estimates, a "last checked" time, a source badge, and a
 * "verify locally" stance. No live-inventory or final-price claims (docs/DECISIONS.md D14).
 */
export function StoreRealityCheck({
  searches,
  live = [],
}: {
  searches: StoreSearch[];
  live?: StoreRealityResult[];
}) {
  const t = useTranslations("Live");
  if (searches.length === 0) return null;
  const liveByName = new Map(live.map((r) => [r.canonicalName.toLowerCase(), r]));

  return (
    <Section title={t("storeTitle")} subtitle={t("storeSubtitle")}>
      <a
        href={nearbyGardenCentersUrl()}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong"
      >
        📍 {t("findNearby")}
      </a>

      <ul className="mt-3 divide-y divide-border">
        {searches.map((s, i) => {
          const lr = liveByName.get(s.name.toLowerCase());
          const matchSource = lr?.matches[0]?.source;
          return (
            <li key={`${s.name}-${i}`} className="py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted">
                  {AVAILABILITY_LABEL[s.availability]}
                </span>
                {matchSource ? <LiveBadge source={matchSource} /> : null}
                {s.deliveryRecommended ? (
                  <span className="rounded bg-warn/10 px-1.5 py-0.5 text-xs text-warn">
                    {t("deliveryWorthChecking")}
                  </span>
                ) : null}
                <span className="ml-auto flex gap-2 text-xs">
                  <a href={homeDepotSearchUrl(s.query)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    Home Depot
                  </a>
                  <a href={lowesSearchUrl(s.query)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    Lowe&apos;s
                  </a>
                  <a href={webSearchUrl(s.query)} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                    Search
                  </a>
                </span>
              </div>

              {lr?.priceRange ? (
                <p className="mt-1 text-xs text-muted">
                  <span className="font-medium text-foreground">{t("priceEstimate")}:</span>{" "}
                  <span className="tabular-nums">
                    {fmtRange(lr.priceRange.low, lr.priceRange.high)} {lr.priceRange.currency}
                  </span>
                  {" · "}
                  {t("lastChecked")} {lastCheckedLabel(lr.lastCheckedAt, t("checkedJustNow"))}
                </p>
              ) : null}

              <div className="mt-1 grid gap-1 text-xs text-muted sm:grid-cols-3">
                {s.substitute ? (
                  <p>
                    <span className="font-medium text-foreground">{t("ifUnavailable")}:</span> {s.substitute}
                  </p>
                ) : null}
                {s.cheaperAlternative ? (
                  <p>
                    <span className="font-medium text-foreground">{t("cheaper")}:</span> {s.cheaperAlternative}
                  </p>
                ) : null}
                {s.easierAlternative ? (
                  <p>
                    <span className="font-medium text-foreground">{t("easier")}:</span> {s.easierAlternative}
                  </p>
                ) : null}
              </div>
              {s.note ? <p className="mt-1 text-xs text-muted">{s.note}</p> : null}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted">{t("storeDisclaimer")}</p>
    </Section>
  );
}
