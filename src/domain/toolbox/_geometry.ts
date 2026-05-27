/**
 * Shared geometry for area-based Toolbox calculators — framework-free. Keeps every tool's
 * shape→area math identical to the Mulch reference and reports area in square feet (canonical
 * internal unit) regardless of the user's chosen unit.
 */
import { z } from "zod";

export const SQFT_PER_SQM = 10.7639;
export const IN_PER_CM = 1 / 2.54;
export const CUFT_PER_CUYD = 27;

export const Shape = z.enum(["rectangle", "circle", "area"]);
export type Shape = z.infer<typeof Shape>;

export const LenUnit = z.enum(["ft", "m"]);
export type LenUnit = z.infer<typeof LenUnit>;

/** Common shape/dimension inputs shared by area tools. */
export const ShapeInput = {
  shape: Shape.default("rectangle"),
  unit: LenUnit.default("ft"),
  length: z.number().positive().optional(),
  width: z.number().positive().optional(),
  radius: z.number().positive().optional(),
  area: z.number().positive().optional(),
};

export type ShapeDims = {
  shape: Shape;
  unit: LenUnit;
  length?: number;
  width?: number;
  radius?: number;
  area?: number;
};

/** Bed area in square feet for the chosen shape, or null when required dimensions are missing. */
export function areaSqftFromShape(input: ShapeDims): number | null {
  const toSqft = (areaInUnit: number) => (input.unit === "m" ? areaInUnit * SQFT_PER_SQM : areaInUnit);
  let areaInUnit: number | null = null;
  if (input.shape === "rectangle") {
    if (input.length && input.width) areaInUnit = input.length * input.width;
  } else if (input.shape === "circle") {
    if (input.radius) areaInUnit = Math.PI * input.radius * input.radius;
  } else if (input.shape === "area") {
    if (input.area) areaInUnit = input.area;
  }
  if (areaInUnit === null || !Number.isFinite(areaInUnit) || areaInUnit <= 0) return null;
  return round1(toSqft(areaInUnit));
}

/** Perimeter in feet for rectangle (length+width) or circle (radius); null when incomplete. */
export function perimeterFtFromShape(input: ShapeDims): number | null {
  const toFt = (n: number) => (input.unit === "m" ? n * 3.28084 : n);
  let perimInUnit: number | null = null;
  if (input.shape === "rectangle") {
    if (input.length && input.width) perimInUnit = 2 * (input.length + input.width);
  } else if (input.shape === "circle") {
    if (input.radius) perimInUnit = 2 * Math.PI * input.radius;
  }
  if (perimInUnit === null || !Number.isFinite(perimInUnit) || perimInUnit <= 0) return null;
  return round1(toFt(perimInUnit));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
