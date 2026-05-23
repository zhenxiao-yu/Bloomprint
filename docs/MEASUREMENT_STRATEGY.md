# Measurement Strategy

Bloomprint never blocks on measurements and never fakes precision. Size flows through an optional
`Measurement` (`src/domain/models.ts`) with an explicit `source` and `confidence`.

## Precedence (most precise first)

1. **Explicit `areaSqft`** — e.g. a Yard Map measurement. Used directly.
2. **Manual dimensions** — length × width (feet or metres) entered in the intake form. Converted to
   sq ft by `measurementToSqft` (`src/domain/estimation/quantities.ts`) and recorded as a
   `good`-confidence, `manual` measurement.
3. **Unknown** — no size given. The engine assumes a region-typical bed size and records it as an
   assumption (surfaced in the evidence drawer, never hidden).

## Confidence widens ranges, it never invents numbers

`estimateMaterialQuantity(measurement, category)` returns a **range**, not a single value, and the
spread depends on confidence:

| Confidence | ± spread |
| --- | --- |
| `low` | 40% |
| `medium` | 20% |
| `good` | 12% |
| `high` | 8% |

So an estimated bed yields a wide, honest range; a measured bed yields a tight one. Missing
dimensions fall back to area rules — they never produce a fake-precise quantity.

## Capture types (forward-looking)

`InputCaptureType` (`photo | manual_dimensions | no_photo | ar_scan`) is derived from the intake
(`deriveInputCapture`) and used only to label how we learned about the space. Today the supported
sources are **manual** and **estimated**; `photo` estimates and `ar_scan` are reserved for future
capture pipelines (the enum values exist for forward-compatibility, no pipeline yet).

## What stays approximate

Spacing decisions always come from each plant's spacing note, not from a measurement or the concept
board. Material quantities are starting estimates — confirm coverage on the bag/label at the store.
