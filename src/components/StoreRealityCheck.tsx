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
          <li key={`${s.name}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="text-foreground">{s.name}</span>
            <span className="rounded bg-border px-1.5 py-0.5 text-xs text-muted">
              {AVAILABILITY_LABEL[s.availability]}
            </span>
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
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        Heavy items (stone, soil) add up fast — consider delivery if you&apos;re buying more than ~8 bags.
      </p>
    </Section>
  );
}
