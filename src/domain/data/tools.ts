/** Bloomprint Core Library — tools. The common hand tools a DIY bed install needs. */
import type { ToolItem } from "@/domain/models";

export const TOOLS: ToolItem[] = [
  { id: "round-point-shovel", name: "Round-Point Shovel", neededFor: "Digging planting holes", optional: false },
  { id: "garden-fork", name: "Garden Fork", neededFor: "Loosening and turning soil", optional: false },
  { id: "wheelbarrow", name: "Wheelbarrow", neededFor: "Moving soil, mulch, and stone", optional: false },
  { id: "hand-trowel", name: "Hand Trowel", neededFor: "Planting perennials and small plants", optional: false },
  { id: "bow-rake", name: "Bow Rake", neededFor: "Leveling soil and spreading mulch", optional: false },
  { id: "half-moon-edger", name: "Half-Moon Edger", neededFor: "Cutting clean bed edges", optional: false },
  { id: "bypass-pruners", name: "Bypass Pruners", neededFor: "Trimming and shaping plants", optional: false },
  { id: "work-gloves", name: "Work Gloves", neededFor: "Hand protection", optional: false },
  { id: "utility-knife", name: "Utility Knife", neededFor: "Cutting landscape fabric", optional: true },
  { id: "hand-tamper", name: "Hand Tamper", neededFor: "Compacting base under stone or gravel", optional: true },
];
