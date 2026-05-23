# Bloomprint — Live Data Layer

> Make results *feel* current — live-ish prices, planting timing, plant care, invasive caution —
> **without faking certainty.** The deterministic engine stays the source of truth.

## Principle

**Data first, rules second, AI third — and live data fourth.** The Live Data Layer **enriches,
annotates, and verifies** the deterministic plan. It never overrides plants, prices, hardiness,
toxicity, invasive status, quantities, spacing, or labor (see DECISIONS D1/D2/D7/D14). If it is
disabled, slow, or fails, the plan renders fully on its own.

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
- Orchestrator: `src/lib/live-data/enrich.ts` (`getLiveEnrichment`, `realProvidersConfigured`).
- Mock providers: `src/lib/live-data/{retailer,plantFacts,invasive,weather,gbif}.ts`.
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

## Config

All optional; the layer works mock-only with **no keys**.

- `NEXT_PUBLIC_ENABLE_LIVE_DATA` — client-visible feature flag (default `false`).
- `LIVE_DATA_PROVIDER` — `mock` (default) or a real family: `serpapi`, `perenual`, `open-meteo`, `gbif`.
- `SERPAPI_KEY`, `PERENUAL_API_KEY`, `WEATHER_PROVIDER` — for the deferred real adapters (server-only).

`GET /api/live/enrich-plan` returns `{ enabled }` (true only when a real provider is configured).

## Adding a real provider

Each mock module is the seam. To add (e.g.) SerpApi retailer pricing, implement the real fetch inside
`retailer.ts` behind the `LIVE_DATA_PROVIDER === "serpapi"` branch (currently returns `null`):
fetch → Zod-validate → `setCached(...)` with an honest `SourceRef`. The orchestrator, route, UI, and
tests are unchanged. Rules: validate all external output with Zod; never throw (return `null` on
failure); no keys in client bundles; no scraping of checkout/cart/login/hidden-inventory endpoints;
never claim exact stock or final price.
