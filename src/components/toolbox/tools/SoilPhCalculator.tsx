"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeSoilPh, type SoilPhInput, type SoilTexture } from "@/domain/toolbox/soilPh";
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

const TEXTURES: SoilTexture[] = ["sandy", "loam", "clay"];
const inPhRange = (n: number | undefined): n is number => n !== undefined && n >= 3 && n <= 10;

export function SoilPhCalculator() {
  const t = useTranslations("Tools.soilPh");
  const tc = useTranslations("Toolbox.common");

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");
  const [currentPh, setCurrentPh] = useState("6");
  const [targetPh, setTargetPh] = useState("6.5");
  const [texture, setTexture] = useState<SoilTexture>("loam");

  const result = useMemo(() => {
    const cur = num(currentPh);
    const tgt = num(targetPh);
    if (!inPhRange(cur) || !inPhRange(tgt)) return null;
    return computeSoilPh({
      shape: shape as SoilPhInput["shape"],
      unit: unit as SoilPhInput["unit"],
      length: num(length),
      width: num(width),
      radius: num(radius),
      area: num(area),
      currentPh: cur,
      targetPh: tgt,
      texture,
    });
  }, [shape, unit, length, width, radius, area, currentPh, targetPh, texture]);

  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];
  const none = result?.amendment === "none";

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
            <NumberField id="cur" label={t("currentPh")} value={currentPh} onChange={setCurrentPh} />
            <NumberField id="tgt" label={t("targetPh")} value={targetPh} onChange={setTargetPh} />
          </div>
          <Field label={t("texture")}>
            <Select value={texture} onValueChange={(v) => setTexture(v as SoilTexture)}>
              <SelectTrigger aria-label={t("texture")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXTURES.map((x) => (
                  <SelectItem key={x} value={x}>
                    {t(`texture_${x}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>

        {none ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-trust/30 bg-trust/5 p-6 text-center">
            <p className="text-base font-semibold text-foreground">{t("noneTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("noneBody")}</p>
          </div>
        ) : (
          <ToolResult
            hasResult={Boolean(result)}
            range={result ? { low: result.lbLow, high: result.lbHigh } : undefined}
            unitLabel={result?.amendment === "sulfur" ? t("sulfurUnit") : t("limeUnit")}
            note={result ? t("kgNote", { low: result.kgLow, high: result.kgHigh }) : undefined}
            stats={
              result
                ? [
                    { label: t("deltaLabel"), value: `${result.delta > 0 ? "+" : ""}${result.delta}` },
                    { label: tc("bedArea"), value: `${result.areaSqft} ${tc("unitSqFt")}` },
                  ]
                : undefined
            }
            warnings={
              result?.shiftTooBig ? [{ title: t("shiftWarnTitle"), body: t("shiftWarnBody") }] : undefined
            }
            assumptions={result ? [t("assumeRate"), t("assumeRetest"), tc("disclaimer")] : undefined}
            emptyTitle={t("emptyTitle")}
            emptyBody={t("emptyBody")}
          />
        )}
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
