"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeBedArea, type BedAreaInput } from "@/domain/toolbox/bedArea";
import {
  DimensionGroup,
  ToolExplainer,
  ToolResult,
  num,
  type LenUnit,
  type Shape,
} from "@/components/toolbox/_shared";

/** Measure a bed's area + perimeter — the primitive behind every material estimate. */
export function BedAreaCalculator() {
  const t = useTranslations("Tools.bedArea");
  const tc = useTranslations("Toolbox.common");

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");

  const result = useMemo(
    () =>
      computeBedArea({
        shape: shape as BedAreaInput["shape"],
        unit: unit as BedAreaInput["unit"],
        length: num(length),
        width: num(width),
        radius: num(radius),
        area: num(area),
      }),
    [shape, unit, length, width, radius, area],
  );

  const stats = result
    ? [
        { label: tc("area"), value: `${result.areaSqm} ${tc("unitSqM")}` },
        ...(result.perimeterFt !== null
          ? [{ label: tc("perimeter"), value: `${result.perimeterFt} ${tc("unitFt")}` }]
          : []),
      ]
    : undefined;

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
      </form>

      <ToolResult
        hasResult={Boolean(result)}
        range={result ? { low: result.areaSqft, high: result.areaSqft } : undefined}
        unitLabel={tc("unitSqFt")}
        stats={stats}
        assumptions={result ? [tc("disclaimer")] : undefined}
        emptyTitle={t("emptyTitle")}
        emptyBody={t("emptyBody")}
      />
      </div>
      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
