/**
 * Companion planting lookup — pick a crop, see who it grows well (and badly) beside, and why.
 * Framework-free, offline, a curated knowledge table (not the plant catalog). Crop references are
 * keys the UI localizes. Honest: companion planting is traditional guidance, not a guarantee.
 */
import { z } from "zod";

export const TOOLBOX_DISCLAIMER =
  "Companion planting is traditional guidance, not a guarantee — results vary by garden.";

interface CompanionEntry {
  good: string[];
  bad: string[];
  /** Short reason key suffix (Tools.companion.note_<key>). */
  note: string;
}

// Curated common-vegetable companions/antagonists. Keys cross-reference within this table.
const TABLE: Record<string, CompanionEntry> = {
  tomato: { good: ["basil", "carrot", "onion", "lettuce", "marigold"], bad: ["broccoli", "corn", "potato"], note: "tomato" },
  basil: { good: ["tomato", "pepper"], bad: [], note: "basil" },
  pepper: { good: ["basil", "onion", "carrot"], bad: ["beans", "broccoli"], note: "pepper" },
  carrot: { good: ["tomato", "onion", "lettuce", "peas"], bad: ["dill"], note: "carrot" },
  onion: { good: ["carrot", "tomato", "lettuce", "broccoli"], bad: ["beans", "peas"], note: "onion" },
  lettuce: { good: ["carrot", "onion", "strawberry"], bad: [], note: "lettuce" },
  beans: { good: ["corn", "cucumber", "squash"], bad: ["onion", "garlic"], note: "beans" },
  peas: { good: ["carrot", "cucumber", "corn"], bad: ["onion", "garlic"], note: "peas" },
  cucumber: { good: ["beans", "corn", "peas"], bad: ["potato"], note: "cucumber" },
  squash: { good: ["corn", "beans", "marigold"], bad: ["potato"], note: "squash" },
  corn: { good: ["beans", "squash", "cucumber"], bad: ["tomato"], note: "corn" },
  broccoli: { good: ["onion", "lettuce"], bad: ["tomato", "beans", "strawberry"], note: "broccoli" },
  potato: { good: ["beans", "corn"], bad: ["tomato", "cucumber", "squash"], note: "potato" },
  strawberry: { good: ["lettuce", "beans"], bad: ["broccoli"], note: "strawberry" },
  garlic: { good: ["tomato", "carrot"], bad: ["beans", "peas"], note: "garlic" },
  marigold: { good: ["tomato", "squash", "cucumber"], bad: [], note: "marigold" },
};

export const COMPANION_CROPS = Object.keys(TABLE);

export const CompanionInput = z.object({
  crop: z.string(),
});
export type CompanionInput = z.infer<typeof CompanionInput>;

export interface CompanionResult {
  crop: string;
  good: string[];
  bad: string[];
  note: string;
}

export function lookupCompanions(raw: z.input<typeof CompanionInput>): CompanionResult | null {
  const { crop } = CompanionInput.parse(raw);
  const entry = TABLE[crop];
  if (!entry) return null;
  return { crop, good: entry.good, bad: entry.bad, note: entry.note };
}
