import type { StoreSearch } from "@/domain/models";
import {
  AVAILABILITY_LABEL,
  homeDepotSearchUrl,
  lowesSearchUrl,
  nearbyGardenCentersUrl,
  webSearchUrl,
} from "@/domain/store";
import { Section } from "@/components/ui";

/** Honest in-store help: search links + availability *states* (no live-inventory claims). */
export function StoreRealityCheck({ searches }: { searches: StoreSearch[] }) {
  if (searches.length === 0) return null;
  return (
    <Section
      title="At the store"
      subtitle="We don't track live stock — these are search links and a realistic availability guess."
    >
      <a
        href={nearbyGardenCentersUrl()}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white"
      >
        📍 Find garden centers near me
      </a>

      <ul className="mt-3 divide-y divide-border">
        {searches.map((s, i) => (
          <li key={`${s.name}-${i}`} className="py-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-foreground">{s.name}</span>
              <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted">
                {AVAILABILITY_LABEL[s.availability]}
              </span>
              {s.deliveryRecommended ? (
                <span className="rounded bg-[var(--warn)]/10 px-1.5 py-0.5 text-xs text-[var(--warn)]">
                  delivery worth checking
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
            <div className="mt-1 grid gap-1 text-xs text-muted sm:grid-cols-3">
              {s.substitute ? <p><span className="font-medium text-foreground">If unavailable:</span> {s.substitute}</p> : null}
              {s.cheaperAlternative ? <p><span className="font-medium text-foreground">Cheaper:</span> {s.cheaperAlternative}</p> : null}
              {s.easierAlternative ? <p><span className="font-medium text-foreground">Easier:</span> {s.easierAlternative}</p> : null}
            </div>
            {s.note ? <p className="mt-1 text-xs text-muted">{s.note}</p> : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Call before driving for plants, heavy materials, or large quantities. These links are search templates, not stock, aisle, or price claims.
      </p>
    </Section>
  );
}
