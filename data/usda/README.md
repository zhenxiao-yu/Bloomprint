# USDA PLANTS source data (build-time only)

Public-domain exports from the [USDA PLANTS Database](https://plants.usda.gov/). Used at
**build time only** to derive botanical synonyms — they are **not** shipped in the app bundle and
are gitignored because they're multi-MB.

## Files (gitignored)

- `plantlst.txt` — full name list: `Symbol, Synonym Symbol, Scientific Name, Common Name, Family`.
- `SearchResults.csv` — a characteristic-search export (name columns only; **no trait values**).

> These files are **name crosswalks only**. They contain no hardiness, toxicity, spacing, bloom,
> invasive, sun, or water data, so they never feed the locked facts in the Core Library — only
> the live-API search-term widening (Perenual/GBIF).

## Regenerate the synonym map

```bash
npm run data:synonyms
```

Reads `plantlst.txt`, resolves each Core Library plant to its USDA accepted name + synonyms, and
writes `src/domain/data/usda-synonyms.generated.json` (the committed artifact). Re-run whenever the
plant catalog changes or a fresh USDA export is dropped here.

License: U.S. Government work, public domain.
