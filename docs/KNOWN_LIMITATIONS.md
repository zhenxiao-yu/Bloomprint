# Bloomprint — Known Limitations

Honest accounting of what V1 does **not** know precisely. The UI must reflect this — never overclaim.

## Climate / hardiness zones
Region presets are **approximate**. Bloomprint infers a likely hardiness range from a coarse region
match, not a precise property lookup. Local microclimates vary. Always shown as: "Approximate
region … likely hardiness 5b–6b … Confidence: Medium."

## Soil & drainage
When the user doesn't know, Bloomprint **assumes** typical suburban conditions for the region. These
assumptions are surfaced (not hidden) and lower plan confidence. An Accuracy Upgrade Card invites
the user to confirm.

## Pricing
All prices are **ranges**, never exact, and are broken down by category (plants / stone-mulch /
edging / soil / lighting) with an Expected DIY total. There is no live retailer pricing or inventory
in V1; ranges reflect typical retail spans, not a quote.

## Live Data Layer (price estimates, weather, plant facts, invasive caution)
The optional Live Data Layer makes results *feel* current without faking certainty (see
docs/LIVE_DATA_LAYER.md). It **enriches and annotates** the deterministic plan; it never overrides
plants, prices, hardiness, toxicity, invasive status, quantities, spacing, or labor. By default it
runs **mock-only** (no API keys): retailer "price estimates" are the plan's own ranges re-labeled as
estimates, not live or final prices; availability is always hedged ("verify locally" / "appears
available"), **never** "in stock" or guaranteed. Every live fact carries a source, a confidence
label, and a "last checked" time. If the layer is slow, disabled, or fails, the deterministic plan
renders fully on its own. Real retailer/plant/weather/invasive providers are deferred and drop in
behind the same interface without changing the engine.

## Plant / material data
The seed catalog is the **"Bloomprint Core Library"** — a curated starter set (≥25 plants, ≥12
materials, etc.), not a comprehensive database. Regions or species outside coverage fall back to
broad regional rules, flagged as "Local verification recommended."

## Salt, deer, pets, bylaws
Risk flags (road salt, deer pressure, pet/child toxicity, HOA/bylaw) are **advisory heuristics** from
seed data, not guarantees. Staff Helper output carries a "guidance, not a guarantee" disclaimer.

## AI layer
AI improves wording and presentation only. It cannot add accuracy the deterministic engine doesn't
have, and it never introduces new facts. With `AI_PROVIDER=mock` (default), there is no model call.

## Visual planning (Phase 4, deferred)
The future Yard Preview is a **concept board** — scale is approximate. Spacing decisions must use
the plan's spacing notes, not the visual board.

## AR (Phase 5, deferred)
Not in V1. Planned only as progressive enhancement via `model-viewer`; not a blocker.

## Hardiness from ZIP/postal (Phase 3.5)
The ZIP/postal lookup is a **curated set of major North-American metros (US ZIP3) and Canadian
postal regions (FSA letter)** — not full national coverage. A recognized code gives a real, but
still "likely", zone (microclimates vary) and raises confidence; an unrecognized code falls back to
the approximate region preset. Soil, salt, deer, and drainage are still region-typical assumptions,
not location-precise.

## AI "imagined view" (Phase 3.5, optional)
Image rendering is **off unless the deployment sets `IMAGE_API_KEY`**. When on, the image is an
**illustration of the design's mood, not a photo of the user's yard** and not a source of truth —
plant choices, counts, and spacing always come from the deterministic plan. The UI labels it as such.

## Yard photo & vision (Phase 4)
The uploaded photo is held **in the browser only** — it is never uploaded, saved, or included in
share links. It improves the before/after "Now" view for everyone. Photo *analysis* (Claude vision)
is **off unless AI_PROVIDER=claude with a key**; when on, the photo is sent transiently for that one
request and not stored. Vision returns **estimates** (sun exposure, visible features), never
measurements; the user confirms before anything is applied, and it never changes the plan silently.

## Concept board & care reminders (Phase 3)
The concept board is an **approximate, illustrative** top-down layout (plants banded by role) — not
a scale drawing. Blob size and position are for communication; real spacing comes from each plant's
spacing note. The "Take to the store" page reuses the share encoding, so it regenerates the plan
from inputs. The `.ics` care reminders are anchored to a **user-chosen** planting date (not an
inferred one) and use general timing (deep-water early, check at ~6 weeks, spring tidy) — adjust to
local conditions.

## Saved plans & sharing (Phase 2)
Saved plans live in **this browser only** (localStorage) — they aren't synced across devices and are
lost if the user clears site data. Share links encode the plan's **inputs**, not a stored record, so
a very long/edited link may not decode (it falls back to a fresh plan). If the Core Library or engine
changes between versions, an old share link regenerates with the *current* engine, not the original.
