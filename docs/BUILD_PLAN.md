# Bloomprint — Build Plan (agent task list)

Execution order. Each phase must pass validation before the next. Mirrors the approved plan.

**Status legend:** ✅ shipped · 🚧 in progress · 🔜 next · ⏸️ deferred (with reason). The core
phases (0–3) are shipped; the app runs fully with `AI_PROVIDER=mock`, no photo, and no cloud.

## Phase 0 — Repo rules & guardrails ✅
- [x] `CLAUDE.md`
- [x] `docs/SPEC.md` (reconstructed; needs user review)
- [x] `docs/BUILD_PLAN.md`
- [x] `docs/DECISIONS.md`
- [x] `docs/KNOWN_LIMITATIONS.md`

## Phase 1 — Deterministic core (the product brain) ✅
- [x] Scaffold Next.js (App Router, TS, Tailwind) + shadcn/ui, Zod, Vitest, Prettier, ESLint
- [x] `.env.example` (`AI_PROVIDER=mock`, `ANTHROPIC_API_KEY` optional)
- [x] Folder structure: `src/{app,domain,domain/scoring,domain/estimation,domain/rules,domain/fixtures,ai,components,lib}`
- [x] Domain models (Zod) — see SPEC §7
- [x] Rules: `resolveRegion()`, `resolveSoilAssumptions()`
- [x] Scoring: `scorePlantFit()`, `selectPlantCandidates()`, feasibility, `scoreConfidence()`
- [x] Estimation: materials/tools/equipment/labor/budget (by category + Expected DIY total)
- [x] Generators: shopping list (Buy First/Can Wait/Optional), install phases, risk warnings, `generatePlanNarrative()`
- [x] Style families + biases (`designPatternPool`, `regionalAlternatives`, `styleBiases`, `seasonalBiases`)
- [x] `refinePlan(plan, adjustment)` and `generateDeterministicPlan(intake)` (≥1 standout insight)
- [x] Seed Core Library: ≥25 plants, ≥12 materials, ≥8 tools, ≥5 equipment, ≥6 regions
- [x] Demo fixtures: oakville-front-yard, low-maintenance-backyard, privacy-side-yard, pet-safe-front-yard
- [x] Vitest: scoring + estimation + mock pipeline (happy path + edges)

## Phase 2 — Product UI (works on deterministic data, no AI) ✅
- [x] Home: hero + 3 CTAs (no exposed modes)
- [x] Problem-language goal prompt + minimal intake
- [x] Fast first plan → Accuracy Upgrade Card
- [x] Result: hero moment first (confidence sentence + visual summary) → actions/buy/phases/risks → details
- [x] Refinement chips (`refinePlan`)
- [x] Grouped shopping list, install timeline, plant/risk cards
- [x] Visible-memory banner; subtle Simple/Details/Staff Helper toggle
- [x] Staff Helper content + disclaimer

## Phase 3 — AI enhancement (after deterministic plan works) ✅
- [x] `src/ai/provider.ts` (`enhancePlan` only), `mock.ts`, `claude.ts`, `index.ts` factory
- [x] Zod-validate all AI output; reject/repair; fall back to deterministic narrative
- [x] `POST /api/plan` (deterministic → optional enhance → validate → BloomprintPlan)

## Phase 2 (post-V1) — Engagement loop ✅
Validate the core loop (generate → refine → **save → compare → share**). Backend-free.
- [x] Share links: `src/lib/shareLink.ts` — encode `{intake, adjustments}` into `/plan?p=…`, Zod-validated on decode
- [x] Saved plans: `src/lib/plansStore.ts` — localStorage history (useSyncExternalStore)
- [x] Compare: `src/lib/planDiff.ts` (pure) + `src/components/CompareView.tsx`
- [x] `/plans` page (history, open, rename, delete, select-two-to-compare)
- [x] Save/Share action bar + shared-link load in `src/components/PlanExperience.tsx`
- [x] Cookieless analytics: `src/lib/analytics.ts` + `<Analytics/>` (events: generated/refined/saved/shared/compared/accuracy)

## Delight gate
Validate "this actually understands my yard" before deep platform work. Engagement-loop telemetry
feeds this decision.

## Phase 3 (post-V1) — "See it & Use it" ✅
- [x] Deterministic concept board: `src/domain/layout.ts` (pure) + `src/components/ConceptBoard.tsx`
      (top-down, role-banded, draggable, illustrative-scale disclaimer) + Now/Planned toggle
- [x] Take-to-the-store: `/plan/store` print route (reuses share encoding) + print CSS
- [x] `.ics` care reminders: `src/lib/ics.ts` (planting/watering/establishment/spring, user-anchored date)
- [x] Analytics: `plan_visualized`, `store_opened`, `calendar_added`

## Phase 3.5 (post-V1) — Accuracy + opt-in AI render ✅
- [x] **Location accuracy**: `src/domain/data/zones.ts` — curated US ZIP3 + Canada FSA → likely
      USDA/NRCan zone. A recognized ZIP/postal narrows the preset to a real zone and raises
      confidence (`scoreConfidence` boost); uncovered → approximate preset fallback. Optional ZIP
      field in the intake form. Still labeled "likely / microclimates vary."
- [x] **Opt-in AI render**: `src/lib/imageProvider.ts` + `/api/render` (GET enabled / POST render),
      provider-agnostic (OpenAI-images-compatible), OFF unless `IMAGE_API_KEY` is set.
      `ImaginedView` shows only when enabled and labels output "imagined illustration, not a photo."

## Phase 4 (post-V1) — Use your photo ✅
- [x] **Photo upload** (no key): the uploaded photo becomes the "Now" in the before/after.
      `src/components/PhotoPanel.tsx` (client-side downscale to ≤1024px). Photo stays in the
      browser — never uploaded, saved, or put in share links.
- [x] **Opt-in photo vision** (key-gated): `src/lib/visionProvider.ts` + `/api/vision`
      (GET enabled / POST analyze). Returns Zod-validated *confirmable estimates* (sun + observations);
      user taps "Use this" to apply (via the existing accuracy flow). Off unless AI_PROVIDER=claude
      with a key. Never feeds the plan silently.

## Accounts, cloud sync & billing ✅
- [x] **Accounts + optional cloud sync**: Supabase behind storage adapters (`src/lib/storage/`,
      `supabaseProjectStore.ts`). Local-first holds — when Supabase is unconfigured/unreachable the
      app uses localStorage and labels it "Saved on this device." See `docs/SUPABASE_MIGRATION.md`.
- [x] **Billing**: Stripe entitlements, free-by-default, server-enforced (`src/lib/billing/`).

## Yard Preview, photo edition ✅
- [x] Overlay the concept board on the uploaded photo: `src/components/yard-map/YardPreviewOverlay.tsx`
      (react-konva, `ssr:false`) + the Yard Map builder. Still an illustrative, approximate-scale view.

## AR preview ✅
- [x] `src/components/ArView.tsx` — `model-viewer` progressive enhancement (opt-in, below the fold).

## Still deferred (with reasons)
- **Nationwide ZIP→zone dataset** (~100–200 KB): would replace the curated metro lookup with full
  coverage. Needs the dataset sourced + licensed in-repo (we won't fabricate climate facts).
- **Live data providers** (real retailer/plant/weather/invasive APIs): the Live Data Layer runs
  mock-first today; real providers drop in behind the same interface (`src/lib/live-data/`).
  See `docs/LIVE_DATA_LAYER.md`.
