/**
 * Rules — turn raw intake + region preset into the SiteCondition the engine reasons over.
 * Anything the user didn't tell us is filled from region defaults and recorded as an assumption
 * (surfaced in the UI, never hidden — docs/DECISIONS.md D7).
 */
import type { RegionPreset, SiteCondition, Tri, YardIntake } from "@/domain/models";
import { getRegion, REGIONS } from "@/domain/data";
import { lookupZone } from "@/domain/data/zones";

/** A safe fallback when an unknown region id slips through. */
const FALLBACK_REGION: RegionPreset = REGIONS[0];

export function resolveRegion(regionId: string): { region: RegionPreset; recognized: boolean } {
  const region = getRegion(regionId);
  return region ? { region, recognized: true } : { region: FALLBACK_REGION, recognized: false };
}

/** Default bed size (sq ft) when the user skips the size question. */
const DEFAULT_AREA_SQFT = 120;

export function resolveSite(intake: YardIntake): SiteCondition {
  const { region, recognized } = resolveRegion(intake.regionId);
  const assumptions: string[] = [];

  if (!recognized) {
    assumptions.push(
      `We didn't recognize that region, so we used broad rules for ${region.label}. Local verification recommended.`,
    );
  }

  const sun = intake.sun;
  if (sun === "unknown") assumptions.push("Sun exposure unknown — we assumed a mix of sun and part shade.");

  let soil = intake.soil;
  if (soil === "unknown") {
    soil = region.typicalSoil;
    assumptions.push(`Soil unknown — assumed ${region.typicalSoil} (typical for ${region.label}).`);
  }

  let drainage = intake.drainage;
  if (drainage === "unknown") {
    drainage = region.typicalDrainage;
    assumptions.push(`Drainage unknown — assumed ${region.typicalDrainage}.`);
  }

  const saltExposure: Tri = region.saltRisk ? "yes" : "no";

  const areaSqft = intake.areaSqft ?? DEFAULT_AREA_SQFT;
  if (intake.areaSqft === undefined) {
    assumptions.push(`Bed size not given — assumed about ${DEFAULT_AREA_SQFT} sq ft.`);
  }

  // A recognized ZIP/postal code narrows the coarse preset to a real (but still "likely") zone.
  let hardinessMin = region.hardinessMin;
  let hardinessMax = region.hardinessMax;
  let zoneMatch: SiteCondition["zoneMatch"] = null;
  if (intake.locationQuery) {
    const zone = lookupZone(intake.locationQuery);
    if (zone) {
      hardinessMin = zone.min;
      hardinessMax = zone.max;
      zoneMatch = { label: zone.label, precision: zone.precision };
      const range = zone.min === zone.max ? `zone ${zone.min}` : `zones ${zone.min}–${zone.max}`;
      assumptions.push(`Hardiness ${range} from ${zone.label} (microclimates still vary).`);
    } else {
      assumptions.push("That location isn't in our zone library yet — used the region preset instead.");
    }
  }

  return {
    regionId: region.id,
    hardinessMin,
    hardinessMax,
    sun,
    soil,
    drainage,
    saltExposure,
    deerPressure: region.deerPressure,
    areaType: intake.areaType ?? "foundation-bed",
    areaSqft,
    zoneMatch,
    assumptions,
  };
}

export function regionConfidence(regionId: string): RegionPreset["confidence"] {
  return resolveRegion(regionId).region.confidence;
}
