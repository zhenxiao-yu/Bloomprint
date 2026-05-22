/**
 * Concept-board layout — derive an approximate top-down arrangement from the plant palette.
 * Pure and deterministic (no React), so it can run on the server, in tests, and on the client.
 *
 * Coordinates are percentages (0–100) of the board: y=0 is the back of the bed (against the
 * house/fence), y=100 is the front lawn edge. Plants are banded by role: tall structure/screen at
 * the back, mid layer in the middle, low front/accent plants near the lawn. Scale is illustrative
 * only — real spacing comes from each plant's spacingNote (docs/KNOWN_LIMITATIONS.md).
 */
import type { PlantPlacement, PlantRole, VisualPlacement } from "@/domain/models";

const BAND_Y: Record<"back" | "mid" | "front", number> = { back: 24, mid: 50, front: 77 };

const ROLE_BAND: Record<PlantRole, "back" | "mid" | "front"> = {
  screen: "back",
  structure: "back",
  mid: "mid",
  accent: "mid",
  front: "front",
};

const ROLE_SCALE: Record<PlantRole, number> = {
  screen: 1.35,
  structure: 1.25,
  mid: 1.0,
  accent: 0.9,
  front: 0.72,
};

export function generateLayout(placements: PlantPlacement[]): VisualPlacement[] {
  const bands: Record<"back" | "mid" | "front", PlantPlacement[]> = { back: [], mid: [], front: [] };
  for (const p of placements) bands[ROLE_BAND[p.role]].push(p);

  const out: VisualPlacement[] = [];
  (Object.keys(bands) as Array<"back" | "mid" | "front">).forEach((band) => {
    const row = bands[band];
    row.forEach((p, i) => {
      const x = ((i + 1) / (row.length + 1)) * 100;
      const yJitter = i % 2 === 0 ? -4 : 4;
      out.push({
        plantId: p.plantId,
        x: Number(x.toFixed(1)),
        y: Number((BAND_Y[band] + yJitter).toFixed(1)),
        scale: ROLE_SCALE[p.role],
        rotation: 0,
      });
    });
  });

  return out;
}
