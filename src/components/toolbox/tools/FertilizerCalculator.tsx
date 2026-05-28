"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeFertilizer, type FertilizerInput } from "@/domain/toolbox/fertilizer";
import {
  DimensionGroup,
  NumberField,
  ToolExplainer,
  ToolResult,
  num,
  type LenUnit,
  type Shape,
} from "@/components/toolbox/_shared";

export function FertilizerCalculator() {
  const t = useTranslations("Tools.fertilizer");
  const tc = useTranslations("Toolbox.common");

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");
  const [targetN, setTargetN] = useState("1");
  const [nPct, setNPct] = useState("24");

  const result = useMemo(() => {
    const tn = num(targetN);
    const np = num(nPct);
    if (!tn || !np) return null;
    return computeFertilizer({
      shape: shape as FertilizerInput["shape"],
      unit: unit as FertilizerInput["unit"],
      length: num(length),
      width: num(width),
      radius: num(radius),
      area: num(area),
      targetNPer1000: Math.min(tn, 5),
      nitrogenPct: Math.min(np, 60),
    });
  }, [shape, unit, length, width, radius, area, targetN, nPct]);

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
          <NumberField id="tn" label={t("targetN")} value={targetN} onChange={setTargetN} />
          <NumberField id="np" label={t("nitrogenPct")} value={nPct} onChange={setNPct} />
        </form>

        <ToolResult
          hasResult={Boolean(result)}
          range={result ? { low: result.productLb, high: result.productLb } : undefined}
          unitLabel={t("productUnit")}
          note={result ? t("kgNote", { kg: result.productKg }) : undefined}
          stats={
            result
              ? [
                  { label: tc("bedArea"), value: `${result.areaSqft} ${tc("unitSqFt")}` },
                  { label: t("nApplied"), value: t("lbN", { n: result.nitrogenLb }) },
                  { label: t("applications"), value: String(result.applications) },
                  { label: t("perApp"), value: t("lb", { n: result.productPerAppLb }) },
                ]
              : undefined
          }
          assumptions={result ? [tc("disclaimer")] : undefined}
          emptyTitle={t("emptyTitle")}
          emptyBody={t("emptyBody")}
        />
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
