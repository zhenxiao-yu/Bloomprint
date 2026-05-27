# Bloomprint — Live Data Layer

> Make results *feel* current — live-ish prices, planting timing, plant care, invasive caution —
> **without faking certainty.** The deterministic engine stays the source of truth.

## Principle

**Data first, rules second, AI third — and live data fourth.** The Live Data Layer **enriches,
annotates, and verifies** the deterministic plan. It never overrides plants, prices, hardiness,
toxicity, invasive status, quantities, spacing, or labor (see DECISIONS D1/D2/D7/D14). If it is
disabled, slow, or fails, the plan renders fully on its own.

> **Live data is optional; free mode is the default-safe baseline.** When
> `NEXT_PUBLIC_ENABLE_LIVE_DATA=false` (the default), Bloomprint runs in **Free/Open Data Mode**
> (docs/FREE_DATA_MODE.md): curated catalog + generated retailer **search links** (not inventory) +
> seasonal-rule weather, with no keys. External providers only ever *enrich* on top of that — they
> are never required, and the engine never depends on them.

## Honesty contract

- Prices are **estimate ranges**, never a live or final/checkout price. In mock mode the range is
  the plan's own deterministic `MoneyRange`, re-labeled as an estimate — we never invent a number.
- Availability is **hedged**: `appears_available` / `limited` / `verify_locally` / `unavailable` /
  `unknown`. Never "in stock" or guaranteed.
- Every live fact carries a **source** (Source Quality Ladder), a **confidence** label, and a
  **`lastCheckedAt`** time. The UI shows a source badge (Official / Retailer search / Open dataset /
  Estimate / Verify locally) and a "verify before buying" disclaimer.

## Architecture

```
Deterministic plan (source of truth, unchanged)
        │
PlanResult mounts → POST /api/live/enrich-plan  (lazy, best-effort, never blocks)
        │
getLiveEnrichment(summary)  ← mock-first, Zod-validated, never throws
   ├ retailer.ts      → RetailerMatch[] + price estimate range
   ├ weather.ts       → planting-timing note
   ├ plantFacts.ts    → care summary (enrichment only)
   └ invasive.ts      → ecological caution (locked `invasive` flag + regional note)
        │
LivePlanEnrichment → StoreRealityCheck (full UI) + timing note + caution chip + care note
```

Key files:
- Validated boundary: `src/lib/live-data/schema.ts` (`RetailerMatch`, `StoreRealityResult`,
  `WeatherTiming`, `PlantFacts`, `InvasiveRisk`, `LivePlanEnrichment`, `EnrichPlanRequest`).
- Orchestrator: `src/lib/live-data/enrich.ts` (`getLiveEnrichment`, `freeDataEnrichmentEnabled`).
- Providers: `src/lib/live-data/{retailer,plantFacts,invasive,weather,gbif}.ts`; outbound GETs via
  `freeFetch.ts`; Core Library prefetch in `plantEnrichment.ts`.
- Caching: in-memory `src/lib/live-data/cache.ts` + TTLs in `cachePolicy.ts`; optional Supabase
  `live_data_cache` via `src/lib/supabase/cache.ts` (`liveDataCacheGet/Set`).
- Route: `src/app/api/live/enrich-plan/route.ts`. UI: `src/components/StoreRealityCheck.tsx`,
  `src/components/live/LiveBadge.tsx`, wired in `src/components/PlanResult.tsx`.

## Caching tiers

| Kind | TTL |
|------|-----|
| `retailer-products` | 12h |
| `weather` | 6h |
| `plant-facts` | 60d |
| `invasive` | 30d |
| `gbif` / `geocode` | 30d |
| `store-search` | 7d |

## Free-forever providers (no keys, commercial-OK)

The layer runs on free, key-free, commercial-OK sources and is **on by default** — there are no
paid dependencies:

| Data | Source | Key? | How it stays free at scale |
|------|--------|------|----------------------------|
| Plant name + invasive/establishment context | **GBIF** (`gbif.ts`, CC0) | none | build-time prefetch of the Core Library (`scripts/build-plant-data.mjs` → `plant-enrichment.generated.json`); unknown names do one `freeFetch` GET cached in Vercel's Data Cache |
| Hardiness (US ZIP) | **USDA phzmapi** (`hardiness.ts`, public domain) | none | cached 30d |
| Planting window / frost | **regional climatology** (`weather.ts` ← `regions.ts`) | none | deterministic, no network |
| Retailer | generated **search links** (`retailer.ts`) | none | static templates, no inventory/price claims |
| Plant **care** facts | **Bloomprint Core Library** | n/a | locked, never from a free API |

**Removed** (not generous enough for a free product): Perenual (free tier paywalls
`species/details`), Open-Meteo (free tier is CC-BY non-commercial), SerpApi (kept as free search links).

## Config

- `NEXT_PUBLIC_ENABLE_LIVE_DATA` — gates the optional **client** enrichment call.
- `LIVE_DATA_ENRICHMENT=off` — kill-switch for the whole layer (otherwise always on).
- No provider keys are read. `realProvidersConfigured()` is a legacy seam; the layer is gated by
  `freeDataEnrichmentEnabled()`.

`GET /api/live/enrich-plan` returns `{ enabled }` (true by default; false only when the kill-switch is set).

## Outbound calls & caching

`freeFetch.ts` wraps every third-party GET with a timeout, a polite User-Agent, and Vercel's free
shared **Data Cache** (`next: { revalidate }`), so identical queries across users collapse to one
upstream call. The build-time prefetch means the fixed 34-plant library makes **zero** runtime
upstream calls — only unknown/custom names hit GBIF live (then cached).

## Adding a real provider

Each mock module is the seam. To add (e.g.) SerpApi retailer pricing, implement the real fetch inside
`retailer.ts` behind the `LIVE_DATA_PROVIDER === "serpapi"` branch (currently returns `null`):
fetch → Zod-validate → `setCached(...)` with an honest `SourceRef`. The orchestrator, route, UI, and
tests are unchanged. Rules: validate all external output with Zod; never throw (return `null` on
failure); no keys in client bundles; no scraping of checkout/cart/login/hidden-inventory endpoints;
never claim exact stock or final price.
