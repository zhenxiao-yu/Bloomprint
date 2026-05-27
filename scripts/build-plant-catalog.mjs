/**
 * Candidate plant catalog (Node built-ins + global fetch only).
 *
 * A CANDIDATE / to-verify QUEUE of North-American landscape plants — NOT engine facts.
 * Each seed row carries only coarse, sourceable attributes (type, rough USDA zone range,
 * sun, native-to-NA guess, invasive-watch flag, category). The script GBIF-enriches every
 * row (accepted canonical name, family, establishmentMeans) so taxonomy + native/introduced
 * context are sourced, not guessed, then writes a reference artifact.
 *
 * Promotion path: a vetted catalog entry graduates into a full `PlantRecord` in plants.ts
 * only after its locked facts (spacing, mature size, toxicity, invasive) are sourced
 * (ASPCA + extension) — see docs/KNOWN_LIMITATIONS.md and the audit. This file never feeds
 * the plan directly.
 *
 * Run:  npm run data:catalog
 * Out:  src/domain/data/plant-catalog.generated.json
 *
 * SEED is intentionally a first tranche; add rows in batches to grow toward a 1000+ catalog.
 * Columns: [commonName, botanical, type, zMin, zMax, sun, nativeNA, invasiveWatch, category]
 *   type: evergreen|shrub|perennial|grass|tree|groundcover|vine
 *   sun:  full|part|shade|any
 *   invasiveWatch: true where the species is invasive in parts of NA (must NOT be promoted blindly)
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "src/domain/data/plant-catalog.generated.json");
const GBIF = "https://api.gbif.org/v1";
const UA = "Bloomprint/1.0 (+https://bloomprint.vercel.app; plant catalog)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// First tranche of NA-relevant landscape plants. Coarse attrs only; GBIF fills taxonomy.
// (commonName, botanical, type, zMin, zMax, sun, nativeNA, invasiveWatch, category)
const SEED = [
  // Shrubs
  ["Doublefile Viburnum", "Viburnum plicatum", "shrub", 5, 8, "part", false, false, "shrub"],
  ["Arrowwood Viburnum", "Viburnum dentatum", "shrub", 3, 8, "part", true, false, "shrub"],
  ["Oakleaf Hydrangea", "Hydrangea quercifolia", "shrub", 5, 9, "part", true, false, "shrub"],
  ["Smooth Hydrangea", "Hydrangea arborescens", "shrub", 3, 9, "part", true, false, "shrub"],
  ["Summersweet", "Clethra alnifolia", "shrub", 3, 9, "part", true, false, "shrub"],
  ["Virginia Sweetspire", "Itea virginica", "shrub", 5, 9, "part", true, false, "shrub"],
  ["Dwarf Fothergilla", "Fothergilla gardenii", "shrub", 5, 8, "part", true, false, "shrub"],
  ["Bluebeard", "Caryopteris x clandonensis", "shrub", 5, 9, "full", false, false, "shrub"],
  ["Glossy Abelia", "Abelia x grandiflora", "shrub", 6, 9, "full", false, false, "shrub"],
  ["Japanese Spirea", "Spiraea japonica", "shrub", 4, 8, "full", false, true, "shrub"],
  ["American Elderberry", "Sambucus canadensis", "shrub", 3, 9, "full", true, false, "shrub"],
  ["Red Chokeberry", "Aronia arbutifolia", "shrub", 4, 9, "full", true, false, "shrub"],
  ["Winterberry Holly", "Ilex verticillata", "shrub", 3, 9, "part", true, false, "shrub"],
  ["Common Lilac", "Syringa vulgaris", "shrub", 3, 7, "full", false, false, "shrub"],
  ["Burning Bush", "Euonymus alatus", "shrub", 4, 8, "full", false, true, "shrub"],
  ["Butterfly Bush", "Buddleja davidii", "shrub", 5, 9, "full", false, true, "shrub"],
  // Evergreens
  ["Mountain Laurel", "Kalmia latifolia", "evergreen", 4, 9, "part", true, false, "evergreen"],
  ["Japanese Pieris", "Pieris japonica", "evergreen", 5, 8, "part", false, false, "evergreen"],
  ["Catawba Rhododendron", "Rhododendron catawbiense", "evergreen", 4, 8, "part", true, false, "evergreen"],
  ["Inkberry Holly", "Ilex glabra", "evergreen", 4, 9, "part", true, false, "evergreen"],
  ["Blue Star Juniper", "Juniperus squamata", "evergreen", 4, 8, "full", false, false, "evergreen"],
  ["Hinoki False Cypress", "Chamaecyparis obtusa", "evergreen", 4, 8, "full", false, false, "evergreen"],
  ["Eastern White Pine", "Pinus strobus", "evergreen", 3, 8, "full", true, false, "evergreen"],
  ["Colorado Blue Spruce", "Picea pungens", "evergreen", 2, 7, "full", true, false, "evergreen"],
  // Perennials
  ["Black-Eyed Susan", "Rudbeckia fulgida", "perennial", 3, 9, "full", true, false, "perennial"],
  ["Purple Coneflower", "Echinacea purpurea", "perennial", 3, 8, "full", true, false, "perennial"],
  ["Threadleaf Coreopsis", "Coreopsis verticillata", "perennial", 3, 9, "full", true, false, "perennial"],
  ["Autumn Joy Stonecrop", "Hylotelephium telephium", "perennial", 3, 9, "full", false, false, "perennial"],
  ["Catmint", "Nepeta x faassenii", "perennial", 3, 8, "full", false, false, "perennial"],
  ["Russian Sage", "Salvia yangii", "perennial", 4, 9, "full", false, false, "perennial"],
  ["Common Yarrow", "Achillea millefolium", "perennial", 3, 9, "full", true, false, "perennial"],
  ["Bearded Iris", "Iris germanica", "perennial", 3, 9, "full", false, false, "perennial"],
  ["Lenten Rose", "Helleborus orientalis", "perennial", 4, 9, "part", false, false, "perennial"],
  ["Garden Phlox", "Phlox paniculata", "perennial", 4, 8, "full", true, false, "perennial"],
  ["Peony", "Paeonia lactiflora", "perennial", 3, 8, "full", false, false, "perennial"],
  ["Hardy Geranium", "Geranium x cantabrigiense", "perennial", 4, 8, "part", false, false, "perennial"],
  ["Joe-Pye Weed", "Eutrochium purpureum", "perennial", 4, 9, "full", true, false, "native-perennial"],
  ["New York Ironweed", "Vernonia noveboracensis", "perennial", 5, 9, "full", true, false, "native-perennial"],
  ["Foxglove Beardtongue", "Penstemon digitalis", "perennial", 3, 8, "full", true, false, "native-perennial"],
  ["Wild Columbine", "Aquilegia canadensis", "perennial", 3, 8, "part", true, false, "native-perennial"],
  ["Cardinal Flower", "Lobelia cardinalis", "perennial", 3, 9, "part", true, false, "native-perennial"],
  ["Swamp Milkweed", "Asclepias incarnata", "perennial", 3, 9, "full", true, false, "native-perennial"],
  // Grasses
  ["Maiden Grass", "Miscanthus sinensis", "grass", 5, 9, "full", false, true, "grass"],
  ["Fountain Grass", "Pennisetum alopecuroides", "grass", 5, 9, "full", false, true, "grass"],
  ["Feather Reed Grass", "Calamagrostis x acutiflora", "grass", 4, 9, "full", false, false, "grass"],
  ["Pink Muhly Grass", "Muhlenbergia capillaris", "grass", 5, 9, "full", true, false, "grass"],
  ["Big Bluestem", "Andropogon gerardii", "grass", 3, 9, "full", true, false, "grass"],
  ["Sedge", "Carex pensylvanica", "grass", 3, 8, "shade", true, false, "grass"],
  // Groundcovers
  ["Creeping Thyme", "Thymus serpyllum", "groundcover", 4, 8, "full", false, false, "groundcover"],
  ["Bigroot Geranium", "Geranium macrorrhizum", "groundcover", 3, 8, "part", false, false, "groundcover"],
  ["Bugleweed", "Ajuga reptans", "groundcover", 3, 9, "part", false, true, "groundcover"],
  ["Allegheny Spurge", "Pachysandra procumbens", "groundcover", 4, 9, "shade", true, false, "groundcover"],
  ["Creeping Phlox", "Phlox subulata", "groundcover", 3, 9, "full", true, false, "groundcover"],
  ["Periwinkle", "Vinca minor", "groundcover", 4, 8, "part", false, true, "groundcover"],
  // Trees
  ["Red Maple", "Acer rubrum", "tree", 3, 9, "full", true, false, "tree"],
  ["Sugar Maple", "Acer saccharum", "tree", 3, 8, "full", true, false, "tree"],
  ["River Birch", "Betula nigra", "tree", 4, 9, "full", true, false, "tree"],
  ["Eastern Redbud", "Cercis canadensis", "tree", 4, 9, "part", true, false, "tree"],
  ["Kousa Dogwood", "Cornus kousa", "tree", 5, 8, "part", false, false, "tree"],
  ["Sweetbay Magnolia", "Magnolia virginiana", "tree", 5, 10, "part", true, false, "tree"],
  ["American Hornbeam", "Carpinus caroliniana", "tree", 3, 9, "part", true, false, "tree"],
  ["Ginkgo", "Ginkgo biloba", "tree", 3, 8, "full", false, false, "tree"],
  ["Katsura Tree", "Cercidiphyllum japonicum", "tree", 4, 8, "full", false, false, "tree"],
  ["Black Tupelo", "Nyssa sylvatica", "tree", 4, 9, "full", true, false, "tree"],
  ["White Fringetree", "Chionanthus virginicus", "tree", 3, 9, "part", true, false, "tree"],
  ["Crabapple", "Malus 'Prairifire'", "tree", 4, 8, "full", false, false, "tree"],
  ["Bald Cypress", "Taxodium distichum", "tree", 4, 10, "full", true, false, "tree"],
  // Vines
  ["Clematis", "Clematis x jackmanii", "vine", 4, 9, "full", false, false, "vine"],
  ["Climbing Hydrangea", "Hydrangea anomala petiolaris", "vine", 4, 8, "part", false, false, "vine"],
  ["Trumpet Honeysuckle", "Lonicera sempervirens", "vine", 4, 9, "full", true, false, "vine"],
  ["Virginia Creeper", "Parthenocissus quinquefolia", "vine", 3, 9, "any", true, false, "vine"],
];

async function getJson(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

const result = [];
let matched = 0;
for (const [commonName, botanical, type, zMin, zMax, sun, nativeNA, invasiveWatch, category] of SEED) {
  const match = await getJson(`${GBIF}/species/match?kingdom=Plantae&name=${encodeURIComponent(botanical)}`);
  let gbif = null;
  if (match && match.usageKey && match.matchType !== "NONE") {
    await sleep(120);
    const dist = await getJson(`${GBIF}/species/${match.usageKey}/distributions?limit=100`);
    const means = new Set();
    for (const r of dist?.results ?? []) if (r.establishmentMeans) means.add(String(r.establishmentMeans).toLowerCase());
    gbif = { usageKey: match.usageKey, canonicalName: match.canonicalName ?? match.scientificName, family: match.family, establishmentMeans: [...means].sort() };
    matched++;
  }
  result.push({
    commonName, botanical, type, zoneMin: zMin, zoneMax: zMax, sun, nativeNA, invasiveWatch, category,
    gbif,
    verified: false, // candidate only — must be sourced before promotion to a PlantRecord
  });
  await sleep(160);
}

writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString(), count: result.length, plants: result }, null, 2) + "\n");
console.log(`Candidate catalog -> ${OUT}`);
console.log(`  seed rows: ${result.length}  ·  GBIF-matched: ${matched}/${result.length}`);
console.log(`  NOTE: candidates only (verified:false). Promote into plants.ts after sourcing locked facts.`);
