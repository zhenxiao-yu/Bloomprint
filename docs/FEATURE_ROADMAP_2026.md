# Feature Roadmap 2026 — "Clarity · Realism · Smarter Decisions"

Goal: let homeowners **see problems early, test alternatives, and plan across seasons and
years** — without breaking Bloomprint's honest-AI contract (deterministic facts are the
source of truth; AI only explains; every estimate is labeled; unknowns lower confidence,
never fake certainty).

This doc ranks candidate features by **impact × effort against the current codebase**, then
gives **build specs** for the chosen "do-next" subset. Effort: **S** ≈ <1 day · **M** ≈ 2–4
days · **L** ≈ 1–2 weeks.

> Grounding: most candidates **extend** existing types/tables/weights rather than rewrite.
> Several are pure UI surfacing of data the engine already computes. See the capability
> inventory referenced inline (file paths below).

---

## Part 1 — Impact × Effort ranking

### Tier 1 — Quick wins (high impact, low effort: data/types already exist)

| # | Feature | Leverage that already exists | Effort |
|---|---------|------------------------------|--------|
| 62 | Good/Better/Best tiers in result UI | `PlanTier` + `buildPlanTiers()` (`src/domain/tiers/index.ts`) — computed, **not surfaced** | S |
| 22 | Invasive-species warning | `PlantRecord.invasive` + live invasive provider (perenual) | S |
| 23 | Toxicity (pets/kids) flags | `PlantRecord.toxicToPetsOrKids` + `dog-safe` chip | S |
| 95 | Deer resistance as *probability* | `PlantRecord.deerResistant` (reframe boolean honestly) | S |
| 19 | "Show raw deterministic plan" toggle | AI enhancement is already a separate object | S |
| 77 | "Where the money goes" breakdown | `budget.byCategory` + `PlanCharts` | S |
| 71 | Show the quantity math | quantities already derived deterministically | S |
| 75 | Honest contingency buffer line | add one line item to budget breakdown | S |
| 63 | Confidence sentence + "what raises it" | `confidenceSentence` + `accuracyUpgrades` (mostly there) | S |

### Tier 2 — High-impact bets (medium effort)

| # | Feature | Leverage / note | Effort |
|---|---------|-----------------|--------|
| 21 + 54 | Crowding & maturity forecast | `spacingCm`, `matureWidthCm`, qty, bed area | M |
| 98 + 64 | Provenance log + editable assumptions | Source Quality Ladder (`src/domain/evidence/sourceQuality.ts`), `EvidenceDrawer` | M |
| 41 + 42 | Bloom calendar + year-round-interest | needs structured bloom data (see **BP-0**) | M |
| 44 + 45 | Seasonal task + frost-aware reminders | `src/lib/ics.ts` + `REGIONS` weather windows | M |
| 32 + 39 | Compare up to 3, named scenarios | `CompareView` + `diffPlans` (`src/lib/planDiff.ts`) | M |
| 33 | Inline "swap this plant" | `AlternativeOptions` + 6-kind alternatives | M |
| 51 + 53 | Growth timeline + replacement schedule | needs growth-rate/lifespan data (see **BP-0**) | M |
| 65 | Sensitivity view (which unknown matters most) | re-run engine with permutations, diff | M |
| 36 | Phasing simulator (cost per stage) | `installPhases` exist; group + cost | M |
| 93 + 94 | Per-plant citations + pollinator value | evidence currently hardcoded; see **BP-0** | M |

### Tier 3 — Bigger builds (high effort, often dormant scaffolding)

| # | Feature | Note | Effort |
|---|---------|------|--------|
| 11–13 | Honest footprint/growth overlays on the map | **dormant**: yard-map zones not yet fed into the plan engine | L |
| 1–10 | Photo measurement → plan (calibration) | calibration UI exists, not integrated (`src/lib/yard-map/measurement.ts`) | L |
| 20 | To-scale printable layout / PDF export | print infra exists (`PrintBar`); to-scale sheet is new | M–L |
| 100 | Pro client-approval flow + version history | Supabase layer exists; sync UI deferred | L |
| 55 | Shade-creep multi-year model | needs growth model + map geometry | L |
| 46 | Weather-adaptive watering schedule | live weather exists; scheduling logic new | M–L |

### Tier 4 — Deprioritize / blocked by honesty policy

- **82 live retailer inventory / real prices as fact** — blocked: we show *search links + ranges*, never inventory/price guarantees. Keep as-is.
- **Per-plant photo catalog** (`PlantImageAsset`) — blocked on licensing; not the same as the bundled marketing photos.
- Any "photoreal after-render of *your* yard" — explicitly **off the table** (contract: never fabricate the user's result).

### BP-0 — Foundational data pass (unblocks 6+ features)

**`Plant Library v1.1` enrichment** — one data task on the 34 `PlantRecord`s in
`src/domain/data/plants.ts` adds: `bloomMonths`, `growthRatePerYearCm` (or slow/med/fast),
`lifespanYears`, `pollinatorValue`, and **real per-plant `evidence` citations** (today all
rows share `[{ source: "Bloomprint Core Library" }]`). No architecture change. Unblocks
#41, #42, #51, #53, #58, #93, #94. **Do this first** — it's the cheapest multiplier.

---

## Build status (2026-05-24 pass)

Verified against the code before building (avoided duplicating shipped work):

- **BP-1 (tiers): already shipped.** `plan.tiers` is populated (`src/domain/plan.ts:147`) and
  rendered in `PlanResult` (`src/components/PlanResult.tsx`), with all i18n keys present.
- **BP-2 (safety): completed this pass.** Toxic + deer warnings already existed; the two real
  gaps were closed — (1) the Core Library `invasive` flag is now wired into
  `generateRiskWarnings` (deterministic/offline, no longer dependent on the optional live
  check); (2) honest `safety: { toxic, invasive }` flags now ride on every `PlantPlacement`
  and render as **point-of-decision badges** in the plants grid. Tests added in
  `src/domain/__tests__/plan.test.ts`.
- **BP-0 (static data): intentionally NOT auto-populated.** Filling `bloomMonths`,
  `growthRate`, `lifespanYears`, and per-plant citations for 34 species from the model's own
  knowledge would violate the prime directive ("AI may not invent plants, prices, spacing,
  toxicity…"). The static-data variant still needs a **sourced** pass (a reviewed CSV), not
  fabrication.
- **BP-0 (live variant): shipped.** Instead of fabricating static data, bloom/care facts now
  flow from a **real, sourced** Perenual adapter (`src/lib/live-data/plantFacts.ts`, behind
  `LIVE_DATA_PROVIDER=perenual` + `PERENUAL_API_KEY`): an optional `bloom` on the
  care-enrichment `PlantFacts` schema, mapped from `flowering_season`, surfaced per-plant in
  `PlanResult` behind a `LiveBadge`. The mock stays bloom-free (no fabrication); offline/mock
  degrades to quiet. The pure mapper is unit-tested; the live HTTP path is untested (needs a key).
  **Verified live** against a real Perenual key: free tier gates many cultivar `details` (429),
  so a bounded `baseSpecies()` fallback (exact → `Genus species`) was added.
- **BP-4 (provenance/trust): shipped (the high-value slice).** Added an **"AI presentation"
  on/off toggle** in the plan hero — off collapses to the pure deterministic plan (every
  `enhancement?.x` already falls back to the engine), proving completeness without AI — plus a
  visible AI-wording badge and an honest note ("AI only writes the wording; plants, prices,
  quantities, and risks come from the engine and never change"). The *editable-assumptions*
  part of BP-4 was already served by the existing **Accuracy Upgrade card** (answering
  sun/soil/drainage re-runs the plan), so it wasn't rebuilt. No engine/scoring change.
- **BP-3 (crowding/maturity): shipped.** Calibration first showed the catalog is well-spaced
  (mature-width÷spacing avg 1.24, max 1.67), so a naive "spacing < width" warning would be
  noise. Instead added an exported `maturityFill()` (mature canopy ÷ bed area — area-independent,
  a palette property) and a low-noise `crowding` risk that fires only at **≥2× fill**. It's
  **goal-aware**: a privacy plan gets a positive "fills into a solid hedge" note (low severity),
  others get a "will look full, thin/divide later" heads-up (medium). Of the fixtures, only the
  privacy plan (2.42×) triggers it. The "fills in by year N" estimate is intentionally omitted —
  it needs growth-rate data the static catalog doesn't have (no fabrication). Tests added.
- **BP-5 (seasonal interest): shipped (the honest slice).** Audit showed the data supports
  **season granularity, not months** (the catalog's `seasonInterest` is free text like "summer
  blooms, dries for fall"; regions carry a text `weatherWindow`, no structured frost dates).
  So: added an exported `buildSeasonalInterest()` that **extracts only the seasons the Core
  Library note explicitly names** (+ evergreens/grasses as year-round structure) into a new
  `seasonalInterest` plan field, surfaced as an **"Across the seasons"** 4-season strip with
  honest gaps ("quieter — nothing specific noted"). The 12-month bloom strip and frost-date
  `.ics` reminders from the spec were **dropped** — they'd require month/frost data we don't
  have, and inventing it is off-limits. Best planting window already exists (`bestWeatherWindow`).
  i18n en/zh; tests added.

## Part 2 — Build specs (the "do-next" subset)

Chosen for highest honest-value-per-effort and theme coverage. All must satisfy the
project gate: **works with `AI_PROVIDER=mock` and no uploaded image.**

### BP-0 · Plant Library v1.1 data enrichment
- **Theme:** foundation (realism + seasons + years + trust)
- **Effort:** M (data entry, no code architecture)
- **Changes:** extend `PlantRecord` (`src/domain/models.ts`) with `bloomMonths: number[]`
  (1–12), `growthRate: "slow" | "medium" | "fast"`, `lifespanYears: number`,
  `pollinatorValue: "none" | "low" | "medium" | "high"`; replace the shared `EV` stub with
  per-plant `evidence: EvidenceRef[]` citing real, named sources.
- **Honesty:** cite sources; where a value is a Core-Library estimate, mark it as such.
- **Acceptance:** all 34 plants populated; Zod schema updated; existing plan generation
  unchanged; new fields available to downstream features.

### BP-1 · Good/Better/Best tiers in the result view
- **Theme:** smarter decisions / clarity · **Effort:** S
- **Leverage:** `buildPlanTiers()` (`src/domain/tiers/index.ts`) already returns
  quick/better/best at 0.65× / 1× / 1.4× base budget — **just not shown**.
- **UI:** 3-column tier selector in `PlanResult`; selecting reframes budget + scope; an
  honest line: *"Tiers scale the scope of the project, not the quality of advice."*
- **Honesty:** each tier is a deterministic scaling, labeled as an estimate range; no tier
  implies a guaranteed outcome.
- **Acceptance:** tiers render; switching updates budget/plant counts; chosen tier persists
  into the saved-plan summary; works in mock + no-image.

### BP-2 · Site-safety panel (invasive · toxic · deer)
- **Theme:** see problems early · **Effort:** S–M
- **Leverage:** `PlantRecord.invasive` / `.toxicToPetsOrKids` / `.deerResistant`;
  `generateRiskWarnings()` (`src/domain/generators/index.ts`); live invasive provider.
- **Logic:** for each selected plant emit honest flags. Invasive cross-checked against
  live `invasive[]` when configured (labeled "regional source"). Toxicity → "keep away from
  pets/kids" + source. Deer → *"resistant, not deer-proof."*
- **UI:** "Worth knowing before you buy" card grouped by severity + per-plant badges in
  `ShoppingTable`.
- **Honesty:** probabilities, never guarantees; never auto-remove a plant — warn and offer
  the existing `pet-safer` / `substitute` alternative.
- **Acceptance:** a toxic/invasive plant shows the flag deterministically (mock); live
  source upgrades the note when configured; no false "safe" claim is ever rendered.

### BP-3 · Crowding & maturity forecast
- **Theme:** see problems early + plan across years · **Effort:** M
- **Leverage:** `spacingCm`, `matureWidthCm`, plant quantity, bed area
  (`src/lib/yard-map/measurement.ts`); risk pipeline.
- **Logic:** compare required area at mature spread vs available bed area; if density over
  threshold → *"will crowd by ~year N"* with the spacing math shown; offer a reduced-quantity
  alternative + a thin/divide note (uses `growthRate` from BP-0 to estimate N).
- **UI:** per-bed crowding meter + risk card; "fills in by ~year N" estimate (labeled
  approximate).
- **Honesty:** approximate; low area-confidence widens the estimate and lowers confidence —
  never blocks.
- **Acceptance:** an over-dense palette flags crowding deterministically; unknown area →
  wider range + lower confidence, not an error.

### BP-4 · Plan provenance & assumptions transparency
- **Theme:** honesty centerpiece · **Effort:** M
- **Leverage:** Source Quality Ladder + `buildPlanEvidence()`
  (`src/domain/evidence/sourceQuality.ts`), `EvidenceDrawer`, `SiteCondition.assumptions`,
  the separate `AIPlanEnhancement` object.
- **Features:** (a) **provenance log** — every fact tagged *engine / live-data /
  AI-presentation*; (b) **editable assumptions** panel that re-runs the plan; (c) **"hide AI
  presentation"** toggle leaving a complete deterministic plan.
- **UI:** new provenance tab in `EvidenceDrawer` + a global "AI presentation: on/off" switch.
- **Acceptance:** toggling AI off still yields a complete plan; each evidence row shows its
  source tier; editing an assumption re-derives the plan.

### BP-5 · Seasonal calendar — bloom windows + frost-aware reminders
- **Theme:** plan across seasons · **Effort:** M (after BP-0)
- **Leverage:** `src/lib/ics.ts` (currently 4 fixed events), `REGIONS` weather windows,
  new `bloomMonths` (BP-0).
- **Logic:** 12-month bloom strip + **year-round-interest gaps flagged honestly**; frost-date
  reminders for tender plants; best planting window per item.
- **UI:** bloom strip in result; expanded `.ics` export (bloom + frost + existing care).
- **Honesty:** gaps shown plainly ("nothing blooming in February"); windows labeled
  approximate/regional; only real `bloomMonths` data is used — never invented.
- **Acceptance:** strip renders from data; `.ics` includes bloom + frost events; no plant
  without `bloomMonths` shows a fabricated window.

### BP-6 · Compare up to 3 scenarios + named saves
- **Theme:** test alternatives · **Effort:** M
- **Leverage:** `CompareView`, `diffPlans()` (`src/lib/planDiff.ts`), `plansStore`,
  refinement adjustments.
- **Logic:** extend diff from 2 → 3; save/name scenarios; field-by-field diff (cost, labor,
  maintenance, confidence, plant counts).
- **UI:** 3-up compare; "save this version" naming.
- **Honesty:** comparisons are deterministic; confidence shown per scenario.
- **Acceptance:** 3 scenarios compare side-by-side; saved + named; works fully offline.

---

## Suggested sequence

1. **BP-0** (unblocks the seasonal/years/trust features) →
2. **BP-1, BP-2** (Tier-1 quick wins, ship immediately) →
3. **BP-4** (honesty centerpiece) →
4. **BP-3, BP-5, BP-6** →
5. Then evaluate Tier-3 (map→plan integration is the big realism unlock, but it's the
   largest single bet).

Every ticket keeps the deterministic plan as the source of truth and degrades gracefully
with `AI_PROVIDER=mock` and no image.
