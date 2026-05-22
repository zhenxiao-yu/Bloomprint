/**
 * Alternatives engine — for every plant the plan recommends, offer concrete fallbacks so the user
 * is never stuck (esp. in-store): substitute, cheaper, lower-maintenance, pet-safer, premium, avoid.
 * Deterministic, drawn from the Core Library by role + fit (docs/SPEC.md "Alternatives").
 */
import type {
  Alternative,
  PlantAlternatives,
  PlantPlacement,
  PlantRecord,
  SiteCondition,
  YardIntake,
} from "@/domain/models";
import { PLANTS, getPlant } from "@/domain/data";

/** Curated "avoid" guidance keyed by plant id; falls back to site-derived advice. */
const AVOID_NOTES: Record<string, string> = {
  "emerald-cedar": "Avoid planting tight against driveways/snow-pile zones — road salt browns cedars.",
  "hicks-yew": "Avoid where pets or kids graze — yew foliage and berries are toxic.",
  "green-velvet-boxwood": "Avoid dense, damp pockets — boxwood is prone to blight in poor airflow.",
};

function fits(plant: PlantRecord, site: SiteCondition): boolean {
  if (plant.hardinessMin > site.hardinessMax) return false;
  if (site.sun !== "unknown" && !plant.sun.includes(site.sun)) return false;
  return true;
}

function sameRole(placement: PlantPlacement, site: SiteCondition): PlantRecord[] {
  return PLANTS.filter(
    (p) => p.id !== placement.plantId && p.roles.includes(placement.role) && fits(p, site),
  );
}

export function generateAlternatives(
  placement: PlantPlacement,
  site: SiteCondition,
  intake: YardIntake,
): PlantAlternatives {
  const current = getPlant(placement.plantId);
  const pool = sameRole(placement, site);
  const options: Alternative[] = [];

  // Substitute if unavailable — same role, prefer pet-safe when relevant.
  const subPool = intake.hasPetsOrKids ? pool.filter((p) => !p.toxicToPetsOrKids) : pool;
  const subs = subPool.slice(0, 2).map((p) => p.commonName);
  if (subs.length) {
    options.push({ kind: "substitute", label: subs.join(" or "), note: "Same role and similar fit." });
  }

  // Cheaper
  const cheaper = current
    ? [...pool].filter((p) => p.unitPrice.min < current.unitPrice.min).sort((a, b) => a.unitPrice.min - b.unitPrice.min)[0]
    : undefined;
  options.push(
    cheaper
      ? { kind: "cheaper", label: cheaper.commonName, note: "Lower plant cost for a similar effect." }
      : { kind: "cheaper", label: "A smaller nursery size", note: "Costs less, but fills in more slowly." },
  );

  // Lower maintenance
  if (current && current.maintenance !== "low") {
    const lower = pool.find((p) => p.maintenance === "low");
    if (lower) options.push({ kind: "lower-maintenance", label: lower.commonName, note: "Less seasonal upkeep." });
  }

  // Pet-safer
  if (current?.toxicToPetsOrKids) {
    const safe = pool.find((p) => !p.toxicToPetsOrKids);
    if (safe) options.push({ kind: "pet-safer", label: safe.commonName, note: "Non-toxic to pets/kids." });
  }

  // Premium
  const premium = current
    ? [...pool].filter((p) => p.unitPrice.max > current.unitPrice.max).sort((a, b) => b.unitPrice.max - a.unitPrice.max)[0]
    : undefined;
  options.push(
    premium
      ? { kind: "premium", label: premium.commonName, note: "A higher-end pick for more impact." }
      : { kind: "premium", label: "A larger specimen size", note: "Instant maturity, higher cost." },
  );

  // Avoid
  const avoid =
    AVOID_NOTES[placement.plantId] ??
    (site.saltExposure === "yes" && current && !current.saltTolerant
      ? "Keep this one back from curb/driveway salt spray."
      : "Don't crowd it — use the spacing note so it doesn't thin out as it matures.");
  options.push({ kind: "avoid", label: "Watch-out", note: avoid });

  return { plantId: placement.plantId, commonName: placement.commonName, options };
}

export function generateAllAlternatives(
  placements: PlantPlacement[],
  site: SiteCondition,
  intake: YardIntake,
): PlantAlternatives[] {
  return placements.map((p) => generateAlternatives(p, site, intake));
}
