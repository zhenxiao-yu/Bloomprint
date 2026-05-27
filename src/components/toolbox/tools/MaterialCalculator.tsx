"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeBulk, type BulkInput } from "@/domain/toolbox/bulk";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DimensionGroup,
  Field,
  NumberField,
  ToolExplainer,
  ToolResult,
  num,
  type LenUnit,
  type Shape,
} from "@/components/toolbox/_shared";

const MATERIALS = ["topsoil", "compost", "gravel", "river_rock", "sand", "bark"] as const;
type Material = (typeof MATERIALS)[number];

/** Per-material defaults: bag size (cu ft), whether to show estimated tonnage, default depth (in). */
const PRESET: Record<Material, { bagCuFt: number; tons: boolean; depthIn: number }> = {
  topsoil: { bagCuFt: 1.5, tons: false, depthIn: 4 },
  compost: { bagCuFt: 1.5, tons: false, depthIn: 2 },
  gravel: { bagCuFt: 0.5, tons: true, depthIn: 3 },
  river_rock: { bagCuFt: 0.5, tons: true, depthIn: 3 },
  sand: { bagCuFt: 0.5, tons: true, depthIn: 2 },
  bark: { bagCuFt: 2, tons: false, depthIn: 3 },
};

const BAG_SIZES = [0.5, 1, 1.5, 2] as const;

/**
 * Material Calculator — one tool for topsoil, compost, gravel, river rock, sand, and bark.
 * Grouping the near-identical bulk calculators keeps the toolbox lean and lets new materials
 * be a dropdown option, not a new page. Same area×depth→bags math (`computeBulk`); stone
 * materials also show an estimated tonnage band.
 */
export function MaterialCalculator() {
  const t = useTranslations("Tools.material");
  const tMat = useTranslations("Tools.material.materials");
  const tc = useTranslations("Toolbox.common");

  const [material, setMaterial] = useState<Material>("topsoil");
  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");
  const [depth, setDepth] = useState(String(PRESET.topsoil.depthIn));
  const [bagSize, setBagSize] = useState<number>(PRESET.topsoil.bagCuFt);
  const [extraPct, setExtraPct] = useState("10");

  // Switching material resets the sensible defaults (depth + bag size) for that material.
  function changeMaterial(next: Material) {
    setMaterial(next);
    setBagSize(PRESET[next].bagCuFt);
    setDepth(unit === "ft" ? String(PRESET[next].depthIn) : String(Math.round(PRESET[next].depthIn * 2.54)));
  }

  const preset = PRESET[material];
  const result = useMemo(() => {
    const depthN = num(depth);
    if (!depthN) return null;
    return computeBulk({
      shape: shape as BulkInput["shape"],
      unit: unit as BulkInput["unit"],
      length: num(length),
      width: num(width),
      radius: num(radius),
      area: num(area),
      depth: depthN,
      bagSizeCuFt: bagSize,
      extraPct: num(extraPct) ?? 0,
    });
  }, [shape, unit, length, width, radius, area, depth, bagSize, extraPct]);

  const depthUnit = unit === "ft" ? tc("unitIn") : tc("unitCm");
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  const stats = result
    ? [
        { label: tc("bedArea"), value: `${result.areaSqft} ${tc("unitSqFt")}` },
        { label: tc("volumeYd"), value: `${result.volumeCuYd} ${tc("cuYd")}` },
        ...(preset.tons
          ? [{ label: tc("tons"), value: tc("tonsValue", { low: result.tons.low, high: result.tons.high }) }]
          : []),
      ]
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <Field label={tc("material")}>
            <Select value={material} onValueChange={(v) => changeMaterial(v as Material)}>
              <SelectTrigger aria-label={tc("material")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {tMat(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <DimensionGroup
            shape={shape}
            unit={unit}
            length={length}
            width={width}
            radius={radius}
            area={area}
            onShape={setShape}
            onUnit={setUnit}
            onLength={setLength}
            onWidth={setWidth}
            onRadius={setRadius}
            onArea={setArea}
          />

          <div className="grid grid-cols-2 gap-4">
            <NumberField id="depth" label={`${tc("depth")} (${depthUnit})`} value={depth} onChange={setDepth} />
            <Field label={tc("extra")}>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={extraPct}
                  onChange={(e) => setExtraPct(e.target.value)}
                  className="pr-8"
                  aria-label={tc("extra")}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  %
                </span>
              </div>
            </Field>
          </div>

          <Field label={tc("bagSize")}>
            <Select value={String(bagSize)} onValueChange={(v) => setBagSize(Number(v))}>
              <SelectTrigger aria-label={tc("bagSize")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAG_SIZES.map((b) => (
                  <SelectItem key={b} value={String(b)}>
                    {tc("bagSizeValue", { size: b })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>

        <ToolResult
          hasResult={Boolean(result)}
          range={result?.range}
          unitLabel={tc("bags")}
          note={result ? tc("recommendedBags", { count: result.bagsWithExtra }) : undefined}
          stats={stats}
          assumptions={
            result
              ? [
                  tc("assumeBag", { size: result.bagSizeCuFt }),
                  tc("assumeDepth", { depth: result.depthInches }),
                  tc("assumeBuffer", { pct: result.extraPct }),
                  tc("disclaimer"),
                ]
              : undefined
          }
          emptyTitle={t("emptyTitle")}
          emptyBody={t("emptyBody")}
        />
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
