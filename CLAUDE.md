# Bloomprint — Project Rules

> New here? Read [AGENTS.md](./AGENTS.md) for the repo map, commands, and conventions.

**North Star:** Bloomprint turns yard inspiration into a buildable plan.

Bloomprint must feel like *a smart outdoor transformation assistant*, **not a landscaping intake
system**. It plans a *project* — what to buy, how much, what tools, how many people, in what
order, and what can go wrong.

## Architecture (locked — see docs/DECISIONS.md)

- **Data first, rules second, AI third.** The deterministic plan is the source of truth.
- Build the deterministic engine **before** the AI layer. The app must work fully with
  `AI_PROVIDER=mock` and with no uploaded image.
- AI **explains and presents**, it does not decide. Provider-agnostic, minimal interface:
  `AIProvider.enhancePlan(plan)` only.
- Single API route: `POST /api/plan`. **No raw-AI `/api/analyze` route** (hallucination risk).

## Guardrails

- Do **not** build a chatbot. Use forms, wizards, cards, scores, phases, shopping lists.
  Conversational refinement is allowed only as **constrained chips**, never freeform chat.
- AI may **not** invent plants, prices, labor, spacing, toxicity, hardiness, or invasive status.
  AI may be creative with *presentation* (narrative, talking points, summaries) — facts stay locked.
- All AI output is **Zod-validated**; invalid → reject or repair, never trust raw output.
- No feature without tests for scoring/estimation.
- No external API before the deterministic fallback works.
- Never block the app on auth, Supabase, or AI keys.
- Mobile-first; never skip mobile layout.
- **No profile wall** — quick value first, collect details just-in-time. Unknown reduces
  confidence, never blocks. Encourage, never judge.

## UX non-negotiables (see docs/SPEC.md → UX Principles)

- One confident flow; hidden complexity > visible complexity. Don't expose "modes" as a config screen.
- Problem language, not landscaping taxonomy. Plain language, not jargon.
- Show transformation before logistics (the hero moment) — visual summary before lists.
- Speak like a planner, not a diagnostic engine: confidence as a human sentence, numbers in Details only.
- First plan = Draft 1; invite iteration via refinement chips.
- Every plan carries ≥1 standout insight and varies by style family — never generic slop.

## Stack

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Zod · Vitest · ESLint · Prettier.

## Validation before claiming done

`npm run lint` · `npm run typecheck` · `npm run build` · `npm test` — all clean. Then exercise
the analyze→plan flow with `AI_PROVIDER=mock` and no image.
