/**
 * Build-time USDA synonym map (no runtime deps, Node built-ins only).
 *
 * Reads the public-domain USDA PLANTS exports in data/usda/ and, for each plant
 * in the Core Library, resolves its USDA accepted scientific name + botanical
 * synonyms. Emits a small JSON artifact consumed at runtime to widen live-API
 * search terms (Perenual/GBIF) — purely a NAME crosswalk. It carries no
 * characteristics and never touches locked facts (hardiness, toxicity, etc.).
 *
 * Run:  npm run data:synonyms
 * In:   data/usda/plantlst.txt        (Symbol, Synonym Symbol, Scientific Name, Common Name, Family)
 * Out:  src/domain/data/usda-synonyms.generated.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const USDA_LIST = join(root, "data/usda/plantlst.txt");
const PLANTS_TS = join(root, "src/domain/data/plants.ts");
const OUT = join(root, "src/domain/data/usda-synonyms.generated.json");

/** Split one CSV line into fields, honoring double-quoted fields. */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

/**
 * Normalize a scientific name to "Genus species" (lowercased species), stripping
 * the author string, the hybrid marker (× / "x "), cultivar in quotes, and any
 * parenthetical. Returns "" when no species is present (genus-only entries).
 */
function normalizeName(raw) {
  let s = raw
    .replace(/<\/?i>/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/'[^']*'/g, " ")
    .replace(/[×]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = s.split(" ");
  if (tokens.length < 2) return "";
  const genus = tokens[0];
  // Skip an explicit hybrid token, e.g. "Calamagrostis x acutiflora".
  let speciesIdx = 1;
  if (tokens[speciesIdx] === "x" || tokens[speciesIdx] === "X") speciesIdx++;
  const species = tokens[speciesIdx];
  if (!species || !/^[a-z-]+$/i.test(species)) return "";
  return `${genus} ${species.toLowerCase()}`;
}

// --- Parse USDA list -------------------------------------------------------
if (!existsSync(USDA_LIST)) {
  console.error(`Missing ${USDA_LIST}. Place the USDA PLANTS export there and re-run.`);
  process.exit(1);
}
const lines = readFileSync(USDA_LIST, "utf8").split(/\r?\n/);
/** acceptedSymbol -> { accepted: "Genus species author", names: Set<rawScientificName> } */
const bySymbol = new Map();
/** normalized "Genus species" -> Set<acceptedSymbol> */
const nameIndex = new Map();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  const [symbol, synonymSymbol, sciName] = parseCsvLine(line);
  if (!symbol || !sciName) continue;
  let entry = bySymbol.get(symbol);
  if (!entry) {
    entry = { accepted: null, names: new Set() };
    bySymbol.set(symbol, entry);
  }
  entry.names.add(sciName);
  if (!synonymSymbol) entry.accepted = sciName; // accepted-name row
  const norm = normalizeName(sciName);
  if (norm) {
    let set = nameIndex.get(norm);
    if (!set) nameIndex.set(norm, (set = new Set()));
    set.add(symbol);
  }
}

// --- Extract Core Library plants -------------------------------------------
const ts = readFileSync(PLANTS_TS, "utf8");
const plants = [];
const re = /id:\s*"([^"]+)"[\s\S]*?botanicalName:\s*"([^"]+)"/g;
let m;
while ((m = re.exec(ts))) plants.push({ id: m[1], botanicalName: m[2] });

// --- Resolve each plant ----------------------------------------------------
const result = {};
const report = { matched: [], genusOnly: [], unmatched: [] };

for (const plant of plants) {
  const norm = normalizeName(plant.botanicalName);
  if (!norm) {
    report.genusOnly.push(plant.botanicalName);
    continue;
  }
  const symbols = [...(nameIndex.get(norm) ?? [])];
  if (symbols.length === 0) {
    report.unmatched.push(`${plant.botanicalName}  (normalized: ${norm})`);
    continue;
  }

  // Accuracy first: prefer the symbol where OUR name is itself the USDA accepted
  // name. Only when our name is purely a synonym (no self-accepted symbol) do we
  // adopt the accepted name it resolves to — and only if that resolution is
  // unambiguous. Ambiguous synonym-only matches are skipped, never guessed.
  const selfAccepted = symbols.filter((sym) => {
    const acc = bySymbol.get(sym)?.accepted;
    return acc && normalizeName(acc) === norm;
  });

  let chosen;
  let accepted;
  if (selfAccepted.length > 0) {
    chosen = selfAccepted;
    accepted = stripAuthor(bySymbol.get(selfAccepted[0]).accepted);
  } else if (symbols.length === 1) {
    chosen = symbols; // our name is a synonym that resolves to exactly one accepted name (a rename)
    accepted = stripAuthor(bySymbol.get(symbols[0]).accepted ?? plant.botanicalName);
  } else {
    report.unmatched.push(`${plant.botanicalName}  (ambiguous synonym across ${symbols.length} taxa — skipped)`);
    continue;
  }

  // Synonyms come ONLY from the chosen symbol(s) — never from unrelated taxa.
  const synonyms = new Set();
  for (const sym of chosen) {
    for (const n of bySymbol.get(sym).names) {
      const clean = stripAuthor(n);
      if (clean && normalizeName(clean) !== norm) synonyms.add(clean);
    }
  }
  const list = [...synonyms].sort().slice(0, 8); // cap: search-term widening, not a dump
  result[plant.id] = { accepted, synonyms: list };
  report.matched.push(
    `${plant.botanicalName} -> ${accepted}${list.length ? ` (+${list.length} syn)` : ""}`,
  );
}

/** Drop the botanical author string, keeping "Genus species" (and cultivar/hybrid marks). */
function stripAuthor(raw) {
  const s = raw.replace(/<\/?i>/g, "").replace(/\s+/g, " ").trim();
  const tokens = s.split(" ");
  // Keep up to the species epithet (token 1, or 2 when a hybrid marker is present).
  if (tokens.length < 2) return s;
  let end = 2;
  if (tokens[1] === "×" || tokens[1] === "x") end = 3;
  return tokens.slice(0, end).join(" ");
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");

// --- Report ----------------------------------------------------------------
console.log(`USDA synonym map -> ${OUT}`);
console.log(`  matched:   ${report.matched.length}/${plants.length}`);
console.log(`  genus-only:${report.genusOnly.length}  (no species epithet — cannot crosswalk)`);
console.log(`  unmatched: ${report.unmatched.length}\n`);
console.log("MATCHED:\n  " + report.matched.join("\n  "));
if (report.genusOnly.length)
  console.log("\nGENUS-ONLY (skipped):\n  " + report.genusOnly.join("\n  "));
if (report.unmatched.length)
  console.log("\nUNMATCHED (no USDA accepted name — ornamental/non-US):\n  " + report.unmatched.join("\n  "));
