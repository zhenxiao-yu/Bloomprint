"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeMulch, type MulchShape, type MulchUnit } from "@/domain/toolbox/mulch";
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

const BAG_SIZES = [1.5, 2, 3] as const;

/**
 * Mulch Calculator — the reference Landscape Toolbox tool. Deterministic, works with no AI or
 * network. Shows a bag RANGE (exact → recommended-with-buffer), the depth-safety caution, and
 * every assumption. All math lives in the framework-free domain (`computeMulch`); all shared
 * UI comes from `_shared.tsx`.
 */
export function MulchCalculator() {
  const t = useTranslations("Tools.mulch");
  const tc = useTranslations("Toolbox.common");

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");
  const [depth, setDepth] = useState(unit === "ft" ? "2" : "5");
  const [bagSize, setBagSize] = useState<number>(2);
  const [extraPct, setExtraPct] = useState("10");

  const result = useMemo(() => {
    const depthN = num(depth);
    if (!depthN) return null;
    return computeMulch({
      shape: shape as MulchShape,
      unit: unit as MulchUnit,
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

  return (
    <div className="flex flex-col gap-6">
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
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
          <Field label={t("extra")}>
            <div className="relative">
              <Input
                inputMode="numeric"
                value={extraPct}
                onChange={(e) => setExtraPct(e.target.value)}
                className="pr-8"
                aria-label={t("extra")}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
          </Field>
        </div>

        <Field label={t("bagSize")}>
          <Select value={String(bagSize)} onValueChange={(v) => setBagSize(Number(v))}>
            <SelectTrigger aria-label={t("bagSize")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BAG_SIZES.map((b) => (
                <SelectItem key={b} value={String(b)}>
                  {t("bagSizeValue", { size: b })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </form>

      <ToolResult
        hasResult={Boolean(result)}
        range={result?.range}
        unitLabel={t("bags")}
        note={result ? t("recommendedBags", { count: result.bagsWithExtra }) : undefined}
        stats={
          result
            ? [
                { label: tc("bedArea"), value: `${result.areaSqft} ${tc("unitSqFt")}` },
                { label: t("volume"), value: `${result.volumeCuFt} ${tc("unitCuFt")}` },
              ]
            : undefined
        }
        warnings={
          result?.depthTooDeep
            ? [{ title: t("depthWarningTitle"), body: t("depthWarningBody") }]
            : undefined
        }
        assumptions={
          result
            ? [
                t("assumeBag", { size: result.bagSizeCuFt }),
                t("assumeDepth", { depth: result.depthInches }),
                t("assumeBuffer", { pct: result.recommendedExtraPct }),
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
