# Bloomprint — Build Plan (agent task list)

Execution order. Each phase must pass validation before the next. Mirrors the approved plan.

## Phase 0 — Repo rules & guardrails ✅ (this commit)
- [x] `CLAUDE.md`
- [x] `docs/SPEC.md` (reconstructed; needs user review)
- [x] `docs/BUILD_PLAN.md`
- [x] `docs/DECISIONS.md`
- [x] `docs/KNOWN_LIMITATIONS.md`

## Phase 1 — Deterministic core (the product brain)
- [ ] Scaffold Next.js (App Router, TS, Tailwind) + shadcn/ui, Zod, Vitest, Prettier, ESLint
- [ ] `.env.example` (`AI_PROVIDER=mock`, `ANTHROPIC_API_KEY` optional)
- [ ] Folder structure: `src/{app,domain,domain/scoring,domain/estimation,domain/rules,domain/fixtures,ai,components,lib}`
- [ ] Domain models (Zod) — see SPEC §7
- [ ] Rules: `resolveRegion()`, `resolveSoilAssumptions()`
- [ ] Scoring: `scorePlantFit()`, `selectPlantCandidates()`, feasibility, `scoreConfidence()`
- [ ] Estimation: materials/tools/equipment/labor/budget (by category + Expected DIY total)
- [ ] Generators: shopping list (Buy First/Can Wait/Optional), install phases, risk warnings, `generatePlanNarrative()`
- [ ] Style families + biases (`designPatternPool`, `regionalAlternatives`, `styleBiases`, `seasonalBiases`)
- [ ] `refinePlan(plan, adjustment)` and `generateDeterministicPlan(intake)` (≥1 standout insight)
- [ ] Seed Core Library: ≥25 plants, ≥12 materials, ≥8 tools, ≥5 equipment, ≥6 regions
- [ ] Demo fixtures: oakville-front-yard, low-maintenance-backyard, privacy-side-yard, pet-safe-front-yard
- [ ] Vitest: scoring + estimation + mock pipeline (happy path + edges)

## Phase 2 — Product UI (works on deterministic data, no AI)
- [ ] Home: hero + 3 CTAs (no exposed modes)
- [ ] Problem-language goal prompt + minimal intake
- [ ] Fast first plan → Accuracy Upgrade Card
- [ ] Result: hero moment first (confidence sentence + visual summary) → actions/buy/phases/risks → details
- [ ] Refinement chips (`refinePlan`)
- [ ] Grouped shopping list, install timeline, plant/risk cards
- [ ] Visible-memory banner; subtle Simple/Details/Staff Helper toggle
- [ ] Staff Helper content + disclaimer

## Phase 3 — AI enhancement (after deterministic plan works)
- [ ] `src/ai/provider.ts` (`enhancePlan` only), `mock.ts`, `claude.ts`, `index.ts` factory
- [ ] Zod-validate all AI output; reject/repair; fall back to deterministic narrative
- [ ] `POST /api/plan` (deterministic → optional enhance → validate → BloomprintPlan)

## Delight gate
Validate "this actually understands my yard" before Phases 4–5.

## Phase 4 — Yard Preview (deferred)
Photo upload, 2D placement board, before/planned, approximate-scale disclaimer.

## Phase 5 — AR preview (deferred)
`model-viewer` progressive enhancement.
