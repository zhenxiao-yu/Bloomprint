/** Bloomprint Core Library — rentable equipment. Rental prices are typical per-day ranges. */
import type { EquipmentItem } from "@/domain/models";

export const EQUIPMENT: EquipmentItem[] = [
  {
    id: "sod-cutter",
    name: "Sod Cutter",
    neededWhen: "Removing more than ~150 sq ft of existing lawn",
    rentalPrice: { min: 60, max: 100 },
  },
  {
    id: "rototiller",
    name: "Rototiller",
    neededWhen: "Loosening compacted soil over a large new bed",
    rentalPrice: { min: 50, max: 90 },
  },
  {
    id: "plate-compactor",
    name: "Plate Compactor",
    neededWhen: "Compacting a base for a stone path or patio edge",
    rentalPrice: { min: 60, max: 100 },
  },
  {
    id: "mini-excavator",
    name: "Mini Excavator",
    neededWhen: "Major regrading or moving large stone/boulders",
    rentalPrice: { min: 250, max: 400 },
  },
  {
    id: "utility-trailer",
    name: "Utility Trailer / Truck",
    neededWhen: "Hauling bulk soil, mulch, or stone instead of bags",
    rentalPrice: { min: 30, max: 90 },
  },
  {
    id: "wood-chipper",
    name: "Wood Chipper",
    neededWhen: "Clearing large woody debris before planting",
    rentalPrice: { min: 90, max: 150 },
  },
];
