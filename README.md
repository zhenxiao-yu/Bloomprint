# Bloomprint

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**Bloomprint turns yard inspiration into a buildable plan** — what to buy, how much, what tools,
how many people, in what order, and what can go wrong.

It is a structured planning app, not a chatbot. A deterministic engine is the source of truth and
works fully **with no AI key and no photo**; AI only rephrases the finished plan. See
[docs/DECISIONS.md](docs/DECISIONS.md).

## Quick start

```bash
npm install
cp .env.example .env.local   # optional; defaults to AI_PROVIDER=mock (no key needed)
npm run dev                  # http://localhost:3000
```

Then open the app and tap **Start My Yard Plan**, or **Try the Demo** for an instant example.

## Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start the dev server                          |
| `npm run build`    | Production build                              |
| `npm run lint`     | ESLint                                        |
| `npm run typecheck`| `tsc --noEmit`                                |
| `npm test`         | Vitest (engine + pipeline)                    |

## How it works

```text
intake → region/site rules → Core Library → candidate selection → scoring
→ budget/labor/install → (optional) AI presentation → validation → plan
```

- `src/domain` — framework-free planning engine (models, scoring, estimation, generators, seed data)
- `src/ai` — minimal provider adapter (`mock` default, optional `claude`)
- `src/app/api/plan` — the single planning route
- `src/components` — the product UI

## Enabling Claude (optional)

Set `AI_PROVIDER=claude` and `ANTHROPIC_API_KEY` in `.env.local`. If the key is missing or a call
fails, Bloomprint silently falls back to the deterministic plan.

## Cloud sync (optional)

Bloomprint is **local-first**: saved plans, profile, and photos live on-device (localStorage) and
the deterministic plan never waits on a network. Setting Supabase env vars adds optional accounts +
cross-device sync **behind** that local layer — when the cloud is unconfigured or unreachable, the
app silently uses local storage and labels it "Saved on this device."

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # browser-safe; RLS protects every row
SUPABASE_SERVICE_ROLE_KEY=...             # server-only, optional (AI prompt cache)
```

See [docs/SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) for the storage architecture, RLS
expectations, private photo rules, and how to regenerate the database types.

## Free/Open Data Mode (default)

Bloomprint works **without any paid API** — and that's the default, not a fallback. Free/Open Data
Mode wraps the deterministic plan with free, honest grounding: a curated **Ontario-first** catalog
(each fact sourced + confidence-tagged), **region-aware retailer search links** (Home Depot Canada,
Canadian Tire, RONA, Home Hardware, Amazon.ca for Canada; US retailers for US regions — search
links, **not** live inventory), **price bands** (ranges, never exact), deterministic **material
calculators** that widen when you haven't measured, per-phase **how-to guides**, and a *"verify
before buying"* warning on every retailer result. Real providers are an optional upgrade behind the
Live Data Layer. See [docs/FREE_DATA_MODE.md](docs/FREE_DATA_MODE.md).

## Live Data Layer (optional)

Makes results *feel* current — retailer **price estimates**, planting **timing**, plant **care**, and
**invasive/ecological cautions** — without faking certainty. It **enriches** the deterministic plan
(never overrides facts) and works **mock-first with no API keys**: price "estimates" are the plan's
own ranges, availability is always hedged ("verify locally"), and every live fact shows a source,
confidence, and "last checked" time. Fetched lazily and best-effort, so the plan never waits on it.
Real providers (SerpApi / Perenual / Open-Meteo / GBIF) drop in behind the same interface. See
[docs/LIVE_DATA_LAYER.md](docs/LIVE_DATA_LAYER.md).

## Docs

- [docs/SPEC.md](docs/SPEC.md) — product & design spec
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — build phases
- [docs/DECISIONS.md](docs/DECISIONS.md) — locked architecture decisions
- [docs/SUPABASE_MIGRATION.md](docs/SUPABASE_MIGRATION.md) — optional cloud sync (storage adapters, RLS)
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) — what V1 does not know precisely
- [docs/LIVE_DATA_LAYER.md](docs/LIVE_DATA_LAYER.md) — optional live enrichment (prices, weather, plant facts, invasive)
- [docs/FREE_DATA_MODE.md](docs/FREE_DATA_MODE.md) — how Bloomprint works without paid APIs (default)
- [docs/MEASUREMENT_STRATEGY.md](docs/MEASUREMENT_STRATEGY.md) — manual dimensions, unknowns, confidence

## License

Released under the [MIT License](LICENSE).
