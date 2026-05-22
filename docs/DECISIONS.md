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

## D14 — Trust moat is deterministic and sourced
Every plan ships its own evidence: inputs used, assumptions, confidence-by-dimension, and ranked
sources (Source Quality Ladder, levels 1–6; AI is level 6 and may shape wording only). Each plant
carries deterministic alternatives (substitute / cheaper / lower-maintenance / pet-safer / premium /
avoid) so users are never stuck. Plans list honest failure points and a Store Reality Check that
**never claims live inventory** — only search links + an availability *state* + a "near me" map.
Live distances (Google Places), live inventory, and ML reranking are deferred; preference/refinement
weights come first. *Why:* trust comes from showing what we know, what we don't, and the backups —
not from saying "AI".

## D12 — Accounts are device-local first (cloud-ready seam)
Account creation/management is implemented as a **device account** in localStorage
(`src/lib/accountStore.ts`) — no password, no backend — because we can ship and verify it today and
it matches the app's privacy-light model. The store exposes a small read/write API
(`useAccount`/`createAccount`/`updateAccount`/`signOut`) so a real cloud provider (Clerk/Supabase/
Auth.js + a DB) can replace it without touching the rest of the app. Cloud sync is the upgrade when
retention data and a chosen provider/keys justify it. *Why:* deliver real account UX now without
faking secure cloud auth.

## D13 — AR is wired, assets are configurable
"View in your space" loads Google's `<model-viewer>` (CDN, lazy) with AR enabled. The model is
**configurable via `NEXT_PUBLIC_AR_MODEL_URL`** and defaults to a clearly-labeled *representative*
model, since per-plant 3D assets (.glb) are a content task, not code. The feature is opt-in and
degrades gracefully if the model fails to load. *Why:* ship the AR capability honestly without
implying the 3D shown is the user's exact plants.

## D11 — Optional capabilities degrade to off, never block
Location accuracy uses a *curated* ZIP/postal→zone lookup (no fabricated nationwide data); a miss
falls back to the approximate preset. AI image render is **off unless `IMAGE_API_KEY` is set** and
is decorative only (clearly labeled "imagined illustration, not a photo"; never feeds the plan).
Both follow the same rule as D2: optional capabilities improve the experience when configured and
silently disable otherwise — the deterministic core always works. *Why:* honest precision + never
block on keys.

## D10 — Engagement loop is backend-free
Save/history is `localStorage`; sharing encodes `{intake, adjustments}` into the URL and the
recipient regenerates the plan deterministically. No database, no accounts, no stored user data —
consistent with D5. Analytics is cookieless Vercel Web Analytics with custom events; if disabled,
events are harmless no-ops. *Why:* validate whether users iterate before investing in any backend.
