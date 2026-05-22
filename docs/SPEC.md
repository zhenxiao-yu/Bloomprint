# Bloomprint — Product & Software Design Specification

> ⚠️ **Reconstruction caveat.** An earlier "V0.2" spec existed only as conversation text and was
> never saved; it is not recoverable. This document is a **first-pass reconstruction** from the
> approved build plan and prior product direction. Treat it as a working draft for review — verify
> details before relying on them.

## 1. Product positioning

Bloomprint produces **buildable suburban yard plans** — not generic landscaping inspiration. The
output is a *project*: what to buy, how much, what tools, how many people, in what order, and what
can go wrong. Target users: homeowners planning a yard upgrade, and garden-center staff helping
customers.

**North Star:** *Bloomprint turns yard inspiration into a buildable plan.*

**Product soul:** a smart outdoor transformation assistant, **not** a landscaping intake system.
Guiding maxims: *hidden complexity > visible complexity* and *show transformation before logistics*.

## 2. Product non-negotiables

- The app works fully with no AI key (`AI_PROVIDER=mock`) and with no uploaded image.
- The deterministic plan is the source of truth; AI explains and presents, never decides.
- Every plan answers: what to buy, how much (ranged, by category), what tools, how many people,
  in what order, what can go wrong.
- No profile wall; value first, personalization just-in-time.
- Honest precision — "approximate" and "likely" until real data lookups exist.

## 3. AI is not the source of truth

AI may not invent plants, prices, labor, spacing, toxicity, hardiness, or invasive status. It may
be creative only with *presentation*: design-concept narrative, alternative versions, homeowner
explanations, staff talking points, image prompts, "why not" notes, simplified summaries. All AI
output is Zod-validated; invalid output is rejected or repaired. The deterministic plan stands on
its own without AI.

## 4. User stories & acceptance criteria

- **First plan, minimal input.** From one CTA, a user reaches a useful plan after answering only
  where / what / rough budget / effort / (photo optional). *Accept:* plan generated with no profile
  setup, no AI key, no image.
- **Returning user.** A saved profile prefills the next project. *Accept:* fewer questions asked;
  assumptions shown and editable, never forced re-entry.
- **Unknown inputs.** A user answers "I don't know" to site questions. *Accept:* a plan is still
  produced; confidence is lowered; an Accuracy Upgrade Card lists what would improve it. Never blocked.
- **Refine the plan.** A user taps "Make this easier." *Accept:* the plan changes accordingly.
- **Staff helper.** Garden-center staff get customer summary, questions to ask, Good/Better/Best,
  substitutions, warnings, and a "guidance, not a guarantee" disclaimer.

## 5. UI/UX layout

- **Home:** hero + 3 CTAs (Start My Yard Plan / Help a Customer / Try Demo). No exposed entry modes.
- **Goal prompt:** problem language ("block the neighbors' view"), not taxonomy ("privacy").
- **Intake:** minimal (where / what / budget / effort / photo-or-skip); guided, fast (staff), or
  photo-first variants emerge contextually.
- **Result (hero moment first):** human confidence sentence → visual summary (style label, mood
  chips, layout preview, "what changes visually", expected effort) → Top 3 actions / buy list /
  weekend plan / risks → details. Refinement chips invite Draft 1 → iterate.
- **Modes (subtle toggle):** Simple / Details / Staff Helper.

## 6. UX Principles (V1 non-negotiables)

1. One confident flow; hidden complexity. 2. Progressive disclosure (just-in-time, never a wall).
3. Problem language, not categories. 4. Unknown reduces confidence, never blocks (Accuracy Upgrade
Card). 5. Plain language, not jargon. 6. Speak like a planner — confidence as a sentence; numbers
in Details only. 7. Encouraging, never judging — always offer a simpler version. 8. Show
transformation before logistics. 9. First plan = Draft 1 + constrained refinement chips. 10. Every
plan carries ≥1 standout insight. 11. Modes renamed/de-emphasized (Staff Helper hidden unless
profile = staff). 12. Shopping list grouped Buy First / Can Wait / Optional Upgrades. 13. Honest
precision (approximate region, Core Library coverage). 14. Specific category price ranges + Expected
DIY total. 15. No-photo still yields a layout template. 16. Visible memory. 17. Clear plan labeling.

## 7. Architecture & domain models

Stack: Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Zod · Vitest. The domain layer
(`src/domain`) is framework-free and the source of truth. AI is a thin, swappable adapter (`src/ai`).

**Pipeline:** `user input → region/site rules → plant/material DB → deterministic candidate
selection → scoring → budget/labor/install generation → (optional) AI presentation → Zod
validation → UI`.

Domain models (Zod schemas + inferred types): `UserProfile`, `PropertyProfile`, `YardIntake`,
`RegionPreset`, `SiteCondition`, `PlantRecord`, `MaterialItem`, `ToolItem`, `EquipmentItem`,
`LaborEstimate`, `InstallPhase`, `RiskWarning`, `EvidenceRef`, `ShoppingItem`, `VisualPlacement`,
`DeterministicPlan`, `AIPlanEnhancement`, `BloomprintPlan`.

## 8. Scoring systems

All scores are deterministic, normalized 0–1, and explainable:

- **Plant fit** — how well a plant suits the yard (climate/zone, sun, water, soil, salt, deer, pets).
- **Yard/plan fit** — how well the assembled plan suits the project goal and site.
- **Feasibility** — buildability given budget, effort level, tools, helpers, and labor hours.
- **Confidence** — derived from input completeness and agreement; lowered by unknowns. Shown as a
  human sentence ("This plan should work well for your yard") with ✓/⚠ reasons; numeric only in Details.

## 9. AI contract & validation

`AIProvider.enhancePlan(plan: DeterministicPlan) => Promise<AIPlanEnhancement>`. Request carries the
finished deterministic plan; response is presentation-only and Zod-validated against
`AIPlanEnhancement`. Invalid → reject/repair, fall back to deterministic narrative. AI never adds or
changes facts.

## 10. Risks (severity · mitigation)

- **Onboarding too heavy** (high) → progressive profile, no wall, fast first plan.
- **AI hallucination** (high) → deterministic-first, facts locked, Zod validation.
- **Generic/repetitive plans** (med) → style families + biases; require ≥1 standout insight.
- **False precision** (med) → "approximate"/"likely" framing, coverage notes.
- **Feels rational but unloved** (med) → hero moment, Draft 1 iteration, visible memory.
- **Scope creep into AR/DB** (med) → delight gate before Phases 4–5.

## 11. In scope vs out of scope (V1)

**In:** deterministic planning engine, profile/memory, product UI with hero moment + refinement,
mock + Claude AI adapters, single `/api/plan` route, seed Core Library, Staff Helper mode.
**Out (deferred):** 2D Yard Preview (Phase 4), AR (Phase 5), real-time pricing/inventory APIs, auth,
hosted DB, large plant catalogs.

## 12. Definition of shippable V1

A user reaches a complete, buildable plan from one CTA with minimal input, no AI key, and no image;
the plan includes materials, tools, labor hours, install phases, grouped shopping list, category
price ranges, risks, ≥1 standout insight, and a confidence sentence — and it can be refined. Lint,
typecheck, build, and tests pass.

## 13. Product-team recommendation

Ship the deterministic core + product UI first and validate emotional resonance ("oh wow, this
actually understands my yard") **before** investing in AR, large databases, or external APIs.
