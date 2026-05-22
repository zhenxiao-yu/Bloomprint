/**
 * Yard-map zone model — pure data foundations for the future yard-map editor.
 *
 * These are confirmable ESTIMATES drawn by the user (or proposed by a vision
 * provider for the user to confirm). They are never silently fed into the
 * deterministic plan — the deterministic engine remains the source of truth
 * (CLAUDE.md, docs/DECISIONS.md D1/D2).
 *
 * Coordinates are normalized to the source image: x and y in [0, 1], so a map
 * is resolution-independent and survives image resizing.
 */
import { z } from "zod";
import { Calibration } from "./measurement";

/** The kinds of things a user can mark on a yard photo. */
export const YardZoneType = z.enum([
  "planting_bed",
  "lawn",
  "driveway",
  "walkway",
  "fence",
  "privacy_target",
  "problem_area",
  "keep",
  "remove",
]);
export type YardZoneType = z.infer<typeof YardZoneType>;

/** A point in normalized image coordinates (0..1 on each axis). */
export const Point = z.object({
  x: z.number(),
  y: z.number(),
});
export type Point = z.infer<typeof Point>;

/** Honest confidence label for a marked zone. */
export const ZoneConfidence = z.enum(["high", "medium", "low"]);
export type ZoneConfidence = z.infer<typeof ZoneConfidence>;

/** A single polygon zone the user has marked on the photo. */
export const YardZone = z.object({
  id: z.string(),
  type: YardZoneType,
  points: z.array(Point),
  notes: z.array(z.string()),
  confidence: ZoneConfidence,
});
export type YardZone = z.infer<typeof YardZone>;

/** A full yard map: an optional image reference, its zones, and calibration. */
export const YardMap = z.object({
  id: z.string(),
  imageRef: z.string().optional(),
  zones: z.array(YardZone),
  calibration: Calibration.optional(),
});
export type YardMap = z.infer<typeof YardMap>;

/**
 * Area of a polygon in normalized² units via the shoelace formula.
 *
 * Since coordinates are normalized to [0,1], the result is in fractions of the
 * full image area squared per axis (a value in roughly [0, 1] for sane input).
 * Returns the absolute value, so winding order does not matter. Fewer than 3
 * points cannot enclose an area → 0.
 */
export function polygonAreaNormalized(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

let zoneCounter = 0;

/** Generate a reasonably-unique id without external deps. */
function generateZoneId(): string {
  zoneCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `zone_${Date.now().toString(36)}_${zoneCounter}_${rand}`;
}

/**
 * Create a YardZone with a generated id and sensible defaults.
 * Defaults: type "planting_bed", no points/notes, "medium" confidence.
 */
export function createZone(partial: Partial<Omit<YardZone, "id">> = {}): YardZone {
  return {
    id: generateZoneId(),
    type: partial.type ?? "planting_bed",
    points: partial.points ?? [],
    notes: partial.notes ?? [],
    confidence: partial.confidence ?? "medium",
  };
}

/**
 * Safely parse unknown input into a YardMap.
 * Returns the parsed map on success, or null on any validation failure
 * (never throws — the app must never be blocked by bad map data).
 */
export function parseYardMap(input: unknown): YardMap | null {
  const result = YardMap.safeParse(input);
  return result.success ? result.data : null;
}
