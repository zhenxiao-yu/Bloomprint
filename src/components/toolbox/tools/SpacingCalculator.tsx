"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeSpacing, type SpacingInput, type SpacingPattern } from "@/domain/toolbox/spacing";
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

/** How many plants fit a bed at a given center-to-center spacing (square or triangular). */
export function SpacingCalculator() {
  const t = useTranslations("Tools.spacing");
  const tc = useTranslations("Toolbox.common");

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");
  const [spacing, setSpacing] = useState(unit === "ft" ? "12" : "30");
  const [pattern, setPattern] = useState<SpacingPattern>("square");

  const result = useMemo(() => {
    const s = num(spacing);
    if (!s) return null;
    return computeSpacing({
      shape: shape as SpacingInput["shape"],
      unit: unit as SpacingInput["unit"],
      length: num(length),
      width: num(width),
      radius: num(radius),
      area: num(area),
      spacing: s,
      pattern,
    });
  }, [shape, unit, length, width, radius, area, spacing, pattern]);

  const spacingUnit = unit === "ft" ? tc("unitIn") : tc("unitCm");
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
            <NumberField
              id="spacing"
              label={`${t("spacingLabel")} (${spacingUnit})`}
              value={spacing}
              onChange={setSpacing}
            />
            <Field label={t("pattern")}>
              <Select value={pattern} onValueChange={(v) => setPattern(v as SpacingPattern)}>
                <SelectTrigger aria-label={t("pattern")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="square">{t("patternSquare")}</SelectItem>
                  <SelectItem value="triangular">{t("patternTriangular")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </form>

        <ToolResult
          hasResult={Boolean(result)}
          range={result ? { low: result.plants, high: result.plants } : undefined}
          unitLabel={t("plants")}
          stats={
            result
              ? [
                  { label: tc("bedArea"), value: `${result.areaSqft} ${tc("unitSqFt")}` },
                  { label: t("perPlant"), value: `${result.perPlantSqft} ${tc("unitSqFt")}` },
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
