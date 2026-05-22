# Bloomprint

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

## Docs

- [docs/SPEC.md](docs/SPEC.md) — product & design spec
- [docs/BUILD_PLAN.md](docs/BUILD_PLAN.md) — build phases
- [docs/DECISIONS.md](docs/DECISIONS.md) — locked architecture decisions
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) — what V1 does not know precisely
