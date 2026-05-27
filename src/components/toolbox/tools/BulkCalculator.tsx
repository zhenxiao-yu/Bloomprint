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
  ToolResult,
  num,
  type LenUnit,
  type Shape,
} from "@/components/toolbox/_shared";

const BAG_SIZES = [1, 1.5, 2] as const;

/**
 * Generic bulk-material calculator (topsoil / compost / gravel). Same area×depth→bags math
 * (`computeBulk`); gravel additionally surfaces an estimated tonnage band. Copy comes from
 * `Tools.<slug>` (title/intro/empty) + shared `Toolbox.common`.
 */
export function BulkCalculator({
  slug,
  showTons = false,
  defaultBagCuFt = 1.5,
}: {
  slug: string;
  showTons?: boolean;
  defaultBagCuFt?: number;
}) {
  const t = useTranslations(`Tools.${slug}`);
  const tc = useTranslations("Toolbox.common");

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");
  const [depth, setDepth] = useState(unit === "ft" ? "3" : "8");
  const [bagSize, setBagSize] = useState<number>(defaultBagCuFt);
  const [extraPct, setExtraPct] = useState("10");

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

  const stats = result
    ? [
        { label: tc("bedArea"), value: `${result.areaSqft} ${tc("unitSqFt")}` },
        { label: tc("volumeYd"), value: `${result.volumeCuYd} ${tc("cuYd")}` },
        ...(showTons
          ? [{ label: tc("tons"), value: tc("tonsValue", { low: result.tons.low, high: result.tons.high }) }]
          : []),
      ]
    : undefined;

  return (
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
  );
}
