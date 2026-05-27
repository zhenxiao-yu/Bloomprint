# Candidate plant-catalog seed batches

Each `*.csv` here is a **batch of candidate** North-American landscape plants — a
to-verify queue, **not** engine facts. `scripts/build-plant-catalog.mjs`
(`npm run data:catalog`) merges every CSV in this folder with the inline base
tranche, dedupes by botanical name, GBIF-enriches each row (accepted canonical
name, family, establishment means), and writes
`src/domain/data/plant-catalog.generated.json`.

Nothing here feeds the plan. A row graduates into a real `PlantRecord` in
`src/domain/data/plants.ts` only after its locked facts (spacing, mature size,
toxicity, invasive status) are sourced against ASPCA + extension references.

## CSV format (header row required)

```
commonName,botanical,type,zMin,zMax,sun,nativeNA,invasiveWatch,category
```

- `type`: `evergreen | shrub | perennial | grass | tree | groundcover | vine`
- `sun`: `full | part | shade | any`
- `nativeNA`: `true|false` — native to North America (best-effort; GBIF confirms)
- `invasiveWatch`: `true` if invasive in parts of NA — must NOT be promoted blindly
- `category`: free-text grouping (e.g. `shrub`, `native-perennial`, `warm-zone-tree`)

Botanical names must be real binomials/cultivars GBIF can match; rows that fail
the GBIF match are kept but flagged (`gbif: null`) for manual review.
