# Free/Open Data Mode

Bloomprint produces a complete, buildable plan **without any paid API, key, photo, or cloud.**
Free/Open Data Mode is the safe default state — it is simply what runs whenever the optional Live
Data Layer is off.

## Why it works without paid APIs

The deterministic engine (`src/domain`) is the source of truth. It already knows enough to plan:
plant fit, spacing, quantities, labor, budget ranges, install order, and risks all come from the
curated **Bloomprint Core Library** and rule-based scoring — no network required. Free Data Mode
adds *grounding and shopping help* around that plan, using only data we can serve for free.

## What it provides

- **Curated catalog** — Ontario-first plants & materials with honest fields (`unknown` where we
  aren't sure), each carrying a `SourceRef` and confidence. See `src/domain/data/`.
- **Generated retailer search links** — region-aware (Canadian retailers for Ontario/Canada, US for
  US regions). These are deep links into each retailer's own search, **not** inventory or pricing.
  See `src/domain/store/retailers.ts`.
- **Manual / curated price bands** — ranges only, never an exact or checkout price (`PriceBand`
  pins `isExactPrice: false`).
- **Curated guides & tutorials** — how-to links attached to each install phase, currently generated
  search links (`kind: "search"`) so we never fabricate an authoritative citation. See
  `src/domain/guides/`.
- **Deterministic material calculators** — `estimateMaterialQuantity` turns a measurement into a
  **range** (wider when confidence is low), never a fake-precise number.
- **Confidence labels & verification warnings** — every retailer result carries
  *"Bloomprint can't guarantee live stock or final checkout price. Verify on the retailer site
  before driving."*

## What it never does

- Never claims live stock, an exact aisle, or a final/checkout price.
- Never invents plants, prices, hardiness, toxicity, invasive status, spacing, or labor.
- Never scrapes, and never requires a key.

## Flags

Free Data Mode is derived from the existing live-data flags rather than a competing switch
(`src/lib/freeDataMode.ts`):

| Env var | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_ENABLE_LIVE_DATA` | `false` | When `false`, free mode is on (search links, seasonal rules). |
| `FREE_DATA_MODE_ENABLED` | `true` | Force-off only for a fully-live deployment. |
| `RETAILER_SEARCH_PROVIDER` | `search_links` | Documentation default; live layer overrides when enabled. |
| `WEATHER_PROVIDER` | `seasonal_rules` | Upgrades to a provider only when real providers are configured. |
| `PLANT_DATA_PROVIDER` / `IMAGE_DATA_PROVIDER` / `TUTORIAL_PROVIDER` | `curated` | Curated content. |

A fresh checkout with **none** of these set runs fully in free mode.

## Future paid upgrade path (optional)

Real providers drop in behind the existing Live Data Layer interface (`src/lib/live-data/`) without
touching the engine: SerpAPI (retailer pricing), Perenual (plant facts), Open-Meteo (weather), GBIF
(invasive context), YouTube (tutorials). Enabling them flips `NEXT_PUBLIC_ENABLE_LIVE_DATA=true`;
free mode remains the fallback whenever a provider is slow, disabled, or unconfigured.
