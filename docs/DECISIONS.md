# Bloomprint — Architecture Decisions

Locked decisions. Do not change these without an explicit decision update — they exist to prevent
architectural drift.

## D1 — Deterministic-first
Build the deterministic planning engine before the AI layer. The deterministic plan is the source
of truth and must produce a complete, useful result without any AI key. *Why:* protects against
hallucination, cost, and inconsistency; guarantees the app always works.

## D2 — AI explains, does not decide
AI is a thin, swappable adapter with a single method: `AIProvider.enhancePlan(plan)`. It may
improve presentation only (narrative, alternatives, talking points, summaries). It may not invent
or alter facts (plants, prices, labor, spacing, toxicity, hardiness, invasive status). All output
is Zod-validated; invalid output is rejected or repaired with deterministic fallback.

## D3 — Single API route
`POST /api/plan` runs: input → deterministic plan → optional AI enhancement → validation →
`BloomprintPlan`. There is **no** raw-AI `/api/analyze` route (it would become hallucination central).

## D4 — No chatbot
The product is structured planning (forms, wizards, cards, phases, lists). Conversational
refinement exists only as **constrained chips** that re-run `refinePlan()`, never freeform chat.

## D5 — No profile wall
Profile/personalization is an assistant *memory layer*, never a gate. Quick value first; collect
details just-in-time. Unknown inputs reduce confidence, never block.

## D6 — Hidden complexity > visible complexity
One confident flow. Entry variants (guided / fast / photo-first) and view modes (Simple / Details /
Staff Helper) emerge contextually; they are never exposed as a configuration screen.

## D7 — Honest precision
Region/zone/soil/pricing are approximate until real data lookups exist. Always say "approximate"
and "likely"; label seed data as the "Bloomprint Core Library" with coverage notes; prices are
ranges by category, never exact claims.

## D8 — Domain layer is framework-free
`src/domain` has no React/Next imports. It is pure, unit-tested TypeScript so the engine is testable
and portable. UI and API depend on the domain, not the reverse.

## D9 — Delight gate before platform expansion
Visual Yard Preview (Phase 4) and AR (Phase 5) are deferred until the core flow earns "this actually
understands my yard." Emotional resonance before platform expansion.

## D10 — Engagement loop is backend-free
Save/history is `localStorage`; sharing encodes `{intake, adjustments}` into the URL and the
recipient regenerates the plan deterministically. No database, no accounts, no stored user data —
consistent with D5. Analytics is cookieless Vercel Web Analytics with custom events; if disabled,
events are harmless no-ops. *Why:* validate whether users iterate before investing in any backend.
