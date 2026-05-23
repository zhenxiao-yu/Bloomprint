/**
 * Pure geometry helpers for the honest Yard Preview overlay.
 *
 * No React, no konva, no window — safe on the server and in tests. The overlay
 * draws the deterministic concept layout (generateLayout) over the user's photo,
 * so these helpers only translate that illustrative layout into pixel sizes.
 * Scale is intentionally approximate: the overlay is a concept, not a measured
 * placement (see docs/KNOWN_LIMITATIONS.md).
 */

/**
 * Radius (px) of a plant's translucent "spacing circle".
 *
 * Derived from the layout's per-plant `scale` multiplier (back/structure plants
 * are larger, front/accent plants smaller) and the stage size, so circles stay
 * proportional across viewports. Clamped to stay readable on small screens.
 */
export function spacingCircleRadius(scale: number, stageWidth: number): number {
  const base = stageWidth * 0.07; // ~7% of width for a scale-1 plant
  const r = base * scale;
  const min = stageWidth * 0.04;
  const max = stageWidth * 0.16;
  return Math.min(max, Math.max(min, r));
}

/** Radius (px) of the solid colored dot at a plant's center. */
export function dotRadius(scale: number, stageWidth: number): number {
  return Math.max(5, Math.min(16, stageWidth * 0.013 * scale));
}

/** Abbreviate a common name so labels stay readable on mobile. */
export function abbreviateLabel(name: string, max = 14): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max - 1).trimEnd()}…`;
}
