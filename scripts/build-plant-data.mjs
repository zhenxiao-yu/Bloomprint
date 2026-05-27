/**
 * Build-time GBIF prefetch for the Core Library (Node built-ins + global fetch only).
 *
 * For each plant in src/domain/data/plants.ts, resolves GBIF's accepted canonical name,
 * family, usageKey, and the establishmentMeans seen across distributions (native /
 * introduced / invasive context). Emits a small JSON artifact read at runtime so the live
 * layer makes ZERO upstream calls for known plants — only unknown/custom names hit GBIF live.
 *
 * GBIF is free, key-free, CC0, commercial-OK. We are polite: one identifying User-Agent and a
 * small delay between calls. Re-runnable; safe to commit the output.
 *
 * Run:  npm run data:plants
 * Out:  src/domain/data/plant-enrichment.generated.json   ({ [plantId]: { canonicalName, family, usageKey, establishmentMeans } })
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLANTS_TS = join(root, "src/domain/data/plants.ts");
const OUT = join(root, "src/domain/data/plant-enrichment.generated.json");
const GBIF = "https://api.gbif.org/v1";
const UA = "Bloomprint/1.0 (+https://bloomprint.vercel.app; build-time plant data)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function gbifFor(name) {
  const match = await getJson(`${GBIF}/species/match?kingdom=Plantae&name=${encodeURIComponent(name)}`);
  if (!match || !match.usageKey || match.matchType === "NONE") return null;
  await sleep(150);
  const dist = await getJson(`${GBIF}/species/${match.usageKey}/distributions?limit=100`);
  const means = new Set();
  for (const r of dist?.results ?? []) if (r.establishmentMeans) means.add(String(r.establishmentMeans).toLowerCase());
  return {
    usageKey: match.usageKey,
    canonicalName: match.canonicalName ?? match.scientificName,
    family: match.family,
    establishmentMeans: [...means].sort(),
  };
}

// Extract { id, botanicalName } from the Core Library (same pattern as build-synonyms.mjs).
const ts = readFileSync(PLANTS_TS, "utf8");
const plants = [];
const re = /id:\s*"([^"]+)"[\s\S]*?botanicalName:\s*"([^"]+)"/g;
let m;
while ((m = re.exec(ts))) plants.push({ id: m[1], botanicalName: m[2] });

const result = {};
const report = { matched: [], unmatched: [] };
for (const plant of plants) {
  const data = await gbifFor(plant.botanicalName);
  if (data) {
    result[plant.id] = data;
    report.matched.push(`${plant.botanicalName} -> ${data.canonicalName}${data.establishmentMeans.length ? ` [${data.establishmentMeans.join(", ")}]` : ""}`);
  } else {
    report.unmatched.push(plant.botanicalName);
  }
  await sleep(200);
}

writeFileSync(OUT, JSON.stringify(result, null, 2) + "\n");
console.log(`GBIF plant enrichment -> ${OUT}`);
console.log(`  matched:   ${report.matched.length}/${plants.length}`);
console.log(`  unmatched: ${report.unmatched.length}`);
if (report.matched.length) console.log("\nMATCHED:\n  " + report.matched.join("\n  "));
if (report.unmatched.length) console.log("\nUNMATCHED:\n  " + report.unmatched.join("\n  "));
