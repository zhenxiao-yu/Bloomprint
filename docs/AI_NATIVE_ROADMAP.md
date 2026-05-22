# Bloomprint — AI-Native Roadmap

> Status: planning + early foundations. This document captures the "AI yard
> specialist" direction and how it stays inside Bloomprint's locked architecture.
> It does **not** change any locked decision in [DECISIONS.md](./DECISIONS.md).

## Thesis

Bloomprint should feel like **an AI specialist trained for yards, with real
engineering tools behind it** — not a generic chatbot. Generic AI is good at
conversation and ideas; Bloomprint must be better at turning those into a
*buildable* project: measured zones, calculated materials, versioned plans,
visual previews, store substitutes, install sequencing, and source evidence.

## Non-negotiable guardrails (unchanged)

These come from [CLAUDE.md](../CLAUDE.md) and [DECISIONS.md](./DECISIONS.md) and
**bound every item below**:

- **Data first, rules second, AI third.** The deterministic engine is the source
  of truth. AI/NL **extracts, critiques, explains, and orchestrates** — it never
  decides plants, prices, hardiness, spacing, toxicity, stock, or measurements.
- **Not a chatbot.** Conversational input is allowed only as a *constrained*
  surface that produces structured state (refinements, missing-info prompts,
  plan versions). No freeform chat screen.
- **All AI/tool output is Zod-validated**; invalid → reject/repair, never trust.
- **Never block on AI keys / external APIs.** Everything must work with
  `AI_PROVIDER=mock`, no photo, and the demo flow. External APIs are progressive
  enhancement only, behind a deterministic fallback.
- **Honest uncertainty.** Estimates (measurement, region, availability) are
  labeled as estimates, never presented as exact.

## The loop

```
User input (text / photo / zones)
  → AI/NL extracts STRUCTURED intent (Zod-validated)
  → deterministic engine calculates & validates
  → AI explains the result
  → UI visualizes + stores (versioned)
```

## Built so far (foundations, in this PR)

- **Constrained command bar** — `src/components/CommandBar.tsx` +
  `src/lib/command/parseCommand.ts`. Plain language (EN + ZH) is parsed
  *deterministically* into the existing `RefinementAdjustment` vocabulary and
  applied through the same `onRefine` path as the chips. No AI key required; no
  freeform chat. A future AI intent provider may produce the same structured
  output, but must Zod-validate to `RefinementAdjustment` and cannot invent
  actions outside the list.
- **Yard-map zone model** — `src/lib/yard-map/zoneModel.ts`: `YardZone` /
  `YardMap` types + polygon area helpers (normalized coordinates).
- **Measurement calibration** — `src/lib/yard-map/measurement.ts`: manual
  line-calibration → scale → rough material/plant-count estimates, each carrying
  an `assumptions[]` list and the `MEASUREMENT_DISCLAIMER`.
- **Pluggable vision interface** — `src/lib/vision/types.ts` +
  `mockVisionProvider.ts`. Provider-agnostic `YardVisionProvider`; the existing
  Claude provider (`src/lib/visionProvider.ts`) and future Qwen-VL / Gemini / GLM
  / OpenAI providers implement the same interface. Mock works with no key.

## Phased plan (not yet built)

Each phase keeps the guardrails above. Suggested order:

### A. Command bar → AI intent provider (optional)
Add an `IntentProvider` interface with a deterministic keyword default (already
have `parseCommand`) and an optional AI extractor (DeepSeek/Claude) that returns
the **same** structured `{ adjustments, accuracy, missingQuestions }` schema,
Zod-validated. AI only maps language → existing actions.

### B. Yard-map builder UI (react-konva)
Canvas over the uploaded photo to draw/label zones from the zone model. Drag
labels, resize. Export a `YardMap`. dnd-kit already in the stack for chip-style
interactions; react-konva for polygon drawing. Feeds bed area → material/plant
estimates via the measurement module. Label clearly: *concept placement, not
exact scale*.

### C. Measurement UI
Draw a calibration line, enter a known real length, show estimated areas and
material quantities — always with "Estimated. Confirm before buying or digging."

### D. Visualization
- **Honest Yard Preview**: structured overlay on the photo (silhouettes, spacing
  circles, zone outlines) — trustworthy, not a fake render.
- **AI Concept Render (optional)**: generate a *prompt* for an external image
  model (pluggable: Replicate / fal.ai / Stability / OpenAI Images). Label any
  output "concept render, not a shopping or installation guarantee." Bloomprint
  generates the prompt, never claims the image is accurate.

### E. AR preview
`@google/model-viewer` for representative objects (planter, path light, generic
shrub) with "Representative preview only — actual size/spacing vary." WebXR
hit-test/measure later as progressive enhancement; never required.

### F. Open-data evidence backbone
Source adapters (USDA PLANTS/Hardiness, Canada Hardiness, GBIF, iNaturalist,
Tropicos, PFAF, OpenFarm, university extension, Open-Meteo, OSM/Nominatim) that
**enrich/support** plans with cited evidence + quality/limitation labels. The
Bloomprint Core Library still **decides**; occurrence data is never treated as
suitability proof. Cache aggressively; no random scraping.

### G. DeepSeek (or other) AI provider + tool registry
`AIProvider` stays minimal. Add an optional provider implementing tasks like
`extract_yard_intent`, `refine_plan_command`, `critique_imported_plan`,
`summarize_evidence`, `staff_helper_copy`, `generate_image_prompt`,
`ask_missing_questions`. Tool-calling: the **app** executes deterministic tools
(`calculateMaterials`, `calculateLabor`, `searchTrustedSources`,
`getWeatherContext`, `getRetailerSearchLinks`, `generatePlanVersion`,
`buildYardMapContext`); the AI requests a tool, the app runs it, the AI explains
the result. All inputs/outputs Zod-validated. Falls back to mock on missing
key/failure.

## Acceptance criteria (every phase)

- Works with `AI_PROVIDER=mock`, no photo, no key; demo still works.
- New AI/tool I/O is Zod-validated.
- No freeform chatbot surface; NL becomes structured state.
- Estimates clearly labeled; engine remains the source of truth.
- `lint` / `typecheck` / `build` / `test` pass.
