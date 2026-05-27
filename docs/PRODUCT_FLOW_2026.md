# Bloomprint — Product Flow 2026 (UX direction + roadmap)

> Working doc. Captures the "minimal surface, full power" direction, the target
> photo-first flow, a broad user-story stress test, and a phased plan. Pairs with
> `docs/SPEC.md` (UX principles) and `docs/DECISIONS.md` (locked architecture).

## Why this exists

The app had grown four overlapping "my stuff" surfaces (Dashboard, Saved,
`/projects/[id]`, Pro) and a heavy 8-item nav. New users couldn't tell where to
start or where their work lived, and the same plan opened two different ways.
The North Star is unchanged — *turn yard inspiration into a buildable plan* — but
the surface needs to feel like a 2026 consumer app: open it, see your work, one
obvious primary action, capabilities revealed in context rather than as tabs.

**Pushback on the manifesto, where earned:** the manifesto's "hidden complexity >
visible complexity" and "one confident flow" are right — but the build drifted
the other way (placeholder Toolbox tools, vanity dashboard stats, duplicate
surfaces). This direction re-asserts the manifesto by *removing* surface, not
adding it.

## Design principles (2026)

1. **Open to your work, not a marketing wall.** Signed-in/returning users land on
   the hub (their plans + resume draft). Anonymous users keep quick value (no auth wall).
2. **One primary action, everywhere.** "+ New plan" is a persistent button, not a tab.
3. **Photo-first and mobile-native.** Capture is the front door: take a photo or pick
   from the gallery, on a phone, with the camera-grade guidance we already have.
4. **Honest AI, in context.** Findings carry source + confidence (shared trust badges).
   AI explains and presents; the deterministic engine owns facts.
5. **Retraceable.** Every plan is re-openable, re-runnable, and versioned; nothing is a
   dead end. Comparing alternatives is first-class.
6. **Minimal chrome, full power.** Capabilities live where the task is (row menus,
   section copilot, refinement chips), not as nav weight.

## Target end-to-end flow

```
Home (marketing) ──► "Start a plan"
                       │
Returning user ──► My plans hub ──► "+ New plan"
                       │                    │
                       │                    ▼
                       │            PHOTO INTAKE (mobile-native)
                       │            ├─ Take photo (guided camera)
                       │            ├─ Choose from gallery (multi-select)
                       │            └─ Continue without photos
                       │                    │
                       │                    ▼
                       │            AI YARD READ (honest, labeled)
                       │            zones · observations · assumptions
                       │            each with source + confidence
                       │                    │
                       │                    ▼
                       │            CONFIRM (just-in-time questions)
                       │                    │
                       │                    ▼
                       │            PLAN (deterministic) + AI presentation
                       │            refine via chips · ask section copilot
                       │                    │
                       └──◄ auto-saved ◄────┘  (versioned, retraceable, comparable)
```

The hub (`/plans`, shipped) is the spine: resume draft + saved library (search,
compare, archive, rename, duplicate, delete). Opening any plan re-enters it
(single behavior).

## User-story stress test (~100)

Format: *As [persona], I want [need]* — used to pressure-test that the flow above
covers the breadth, not just the happy path. Grouped by theme.

### Homeowner — getting started (1–12)
1. First-timer, no idea where to start — wants one obvious button.
2. Has 3 phone photos already — wants to pick them from the gallery, not re-shoot.
3. Standing in the yard — wants to take photos right now, guided.
4. No photos, just a problem ("muddy corner") — wants to continue without photos.
5. Unsure if the app is free — wants value before any signup.
6. On the bus — wants to start now, finish later (autosave + resume).
7. Skeptical of AI — wants to see it's not inventing prices/plants.
8. Just browsing — wants a demo/example plan without committing.
9. Low confidence in gardening terms — wants plain language, not taxonomy.
10. Wants a quick ballpark cost before investing time.
11. Returning after a week — wants to find the draft they abandoned.
12. Accidentally closed the tab mid-plan — wants nothing lost.

### Homeowner — the plan itself (13–28)
13. Wants the cheapest version that still looks decent.
14. Wants a premium/finished look and will spend for it.
15. Has a tight weekend — wants effort/time honesty.
16. Pet owner — wants dog-safe plants flagged.
17. Kids — wants non-toxic, durable choices.
18. Allergy-prone — wants low-pollen options.
19. Renter — wants low-commitment, movable ideas.
20. Wants pollinator-friendly / wildlife garden.
21. Wants low-maintenance above all.
22. Wants privacy screening from neighbors.
23. Wants winter interest, not just summer.
24. Wants to resell soon — curb-appeal ROI framing.
25. Wants to reduce watering (drought-tolerant).
26. Wants to know what to buy first vs. what can wait.
27. Wants to swap a plant they dislike for an alternative.
28. Wants to understand *why* a plant was chosen (section copilot).

### Homeowner — comparing & deciding (29–38)
29. Wants to compare "cheap vs. balanced vs. premium" side by side.
30. Wants to compare two style directions before committing.
31. Wants to share a plan with a partner for a decision.
32. Wants to revisit last month's plan and tweak it.
33. Wants to duplicate a plan and try a variation without losing the original.
34. Wants to rename plans so they're findable ("front bed v2").
35. Wants to archive plans they're done with, not delete.
36. Wants to restore something they archived by mistake.
37. Wants to search across many saved plans.
38. Wants to see what changed between two versions of the same yard.

### Mobile-native capture (39–50)
39. Wants the camera to open instantly, rear-facing.
40. Wants framing guidance (gridlines, "step back") while shooting.
41. Wants to know a photo is too dark/blurry *before* relying on it.
42. Wants to pick several gallery photos at once.
43. Wants to retake a single bad photo without redoing the set.
44. Wants to reorder photos (hero shot first).
45. Wants to label a photo ("backyard", "problem area").
46. Wants photos to never leave the device (privacy).
47. Wants capture to work one-handed.
48. Wants to add a measurement photo (tape/sketch) for accuracy.
49. Wants a close-up of an existing plant for a cautious ID note.
50. Wants the flow to degrade gracefully if the camera is denied.

### AI Yard Read — honesty & trust (51–60)
51. Wants to know which findings are confident vs. guessed.
52. Wants assumptions surfaced and editable, not hidden.
53. Wants the app to say "species not confirmed" instead of guessing a plant.
54. Wants sun/soil/drainage treated as confirmable, not fabricated.
55. Wants to see what the app "sees" in the photo (zones overlay).
56. Wants to correct a wrong zone read.
57. Wants no exact dimensions invented from a photo.
58. Wants sources/quality behind any live price or fact.
59. Wants confidence stated as a calm sentence, numbers in details.
60. Wants to proceed even when confidence is low (unknown ≠ blocked).

### Retraceability & history (61–68)
61. Wants every plan re-openable and re-runnable identically.
62. Wants a version label/history per yard.
63. Wants to branch a new version from an old one.
64. Wants to see when each version was saved and what refinements applied.
65. Wants to undo a refinement and get back to a prior draft.
66. Wants a stable share link that regenerates the exact plan.
67. Wants their data exportable (own it, leave anytime).
68. Wants to wipe everything from this device.

### Landscaper / Pro (69–80)
69. Wants to organize plans by client/property.
70. Wants quote-ready notes and a buy list per job.
71. Wants to track a pipeline (lead → quoted → scheduled → done).
72. Wants to reuse a plan template across similar yards.
73. Wants to compare options to present to a client.
74. Wants to work offline at a site and sync later.
75. Wants honest labor/material ranges to base a quote on.
76. Wants to hand a client a clean, branded summary.
77. Wants device-local privacy for client data.
78. Wants to switch quickly between several active jobs.
79. Wants substitution guidance when a plant is out of stock.
80. Wants to avoid over-promising (no fake live inventory).

### Store staff (81–86)
81. Wants fast operational help for a shopper standing there.
82. Wants "if too expensive / no truck / out of stock" answers.
83. Wants upsell and what-not-to-sell guidance, honestly framed.
84. Wants substitutions by role and mature size, not brand guesses.
85. Wants to not depend on AI keys or connectivity.
86. Wants to print/share a buy list quickly.

### Accessibility & inclusivity (87–94)
87. Screen-reader user — wants labeled controls and live regions.
88. Low-vision user — wants a larger text scale that doesn't break layout.
89. Motor-limited user — wants large tap targets and keyboard reach.
90. Reduced-motion user — wants animations calmed.
91. Non-English user — wants the whole flow localized (en/zh today).
92. Colorblind user — wants status not conveyed by color alone.
93. Older device — wants it to stay fast and not require heavy ML.
94. High-contrast preference — wants a legible theme.

### Context, edge & lifecycle (95–100)
95. Flaky connection — wants the deterministic plan to stand alone.
96. No AI / image / live-data keys — wants full core function (mock).
97. Privacy-first — wants no account required and local storage by default.
98. Switched phones — wants an export/import or optional sync path.
99. Came from a shared link — wants to open and then make it their own.
100. Power user — wants the full library tools without nav clutter (row menus, search).

### What the stories tell us (flow implications)
- **Capture must be a true mobile-native fork** (Take photo / Choose from gallery /
  Continue without) — stories 2,3,4,39–50. *Largest remaining gap.*
- **The Yard Read must foreground honesty + editability** — 51–60. (Partly shipped:
  shared confidence badges + localized findings; overlay-edit + correction is next.)
- **Retrace/versioning must be first-class, not implicit** — 61–68. (Saved plans exist;
  explicit per-yard version history + branch is the gap.)
- **Compare must be effortless and presentable** — 29–38,73. (CompareView exists; make it
  reachable in 1 tap and shareable.)
- **Pro + Staff stay as focused modes**, not extra primary nav — 69–86. (Pro lives in More.)
- **Accessibility + i18n are baseline**, validated at the large font scale — 87–94. (Recent
  settings + font-scale + photo-intake i18n work covers much of this.)

## Phased roadmap

- **P0 — One hub + minimal nav. ✅ Shipped.** Dashboard+Saved → `/plans`; `/dashboard` and
  `/projects/[id]` redirect; nav = My plans · Toolbox · More + "+ New plan"; mobile bottom
  nav collapsed. (commit `742e7b7`)
- **P1 — Mobile-native capture.** A first-screen choice: **Take photo** (guided camera, exists)
  · **Choose from gallery** (multi-select file input, `accept="image/*"` without forced
  `capture`) · **Continue without photos**. Make the gallery path explicit and primary on
  touch devices; keep the camera guidance. Files: `src/components/PhotoFirstPlanning.tsx`
  (`addShotOfType`, the dropzone, the example-shots), `PlanExperience` intake step.
- **P2 — Photo-centric Yard Read surfacing.** Promote the "what Bloomprint sees" zones overlay
  and the labeled findings to the top of confirm; allow correcting/dismissing a zone; keep
  honest source/confidence. Reuse `src/lib/vision/*` (DeepLab + heuristic) wiring that already
  exists but isn't surfaced.
- **P3 — Retrace / version history.** Per-yard version timeline (the data already stores
  `versionLabel` + intake/adjustments). Branch-from-version, undo-refinement, and a visible
  history on the plan + hub. Files: `plansStore`, plan result header, hub card.
- **P4 — Compare, one tap + shareable.** Surface compare from a plan and from the hub without
  multi-select friction; shareable comparison link. Reuse `CompareView`.
- **P5 — Surface declutter pass (optional).** Move placeholder Toolbox into More until tools are
  real (or hide "coming soon"); dedupe home CTAs to one primary path.

## Verification (per phase)

`npm run typecheck` · `npm run lint` · `npm run build` · `npm test`, then a screenshot pass
(desktop 1440 + mobile 390, en + zh, default + large font) via a Playwright script. Exercise
the analyze→plan flow with `AI_PROVIDER=mock` and no image. Confirm honest-AI labels and that
the deterministic plan stands alone with no keys.
