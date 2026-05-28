"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeFrenchDrain } from "@/domain/toolbox/frenchDrain";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  NumberField,
  ToolExplainer,
  ToolResult,
  num,
  type LenUnit,
} from "@/components/toolbox/_shared";

export function FrenchDrainCalculator() {
  const t = useTranslations("Tools.frenchDrain");
  const tc = useTranslations("Toolbox.common");

  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("12");
  const [depth, setDepth] = useState("18");
  const [pipeDiameter, setPipeDiameter] = useState("4");

  const result = useMemo(
    () =>
      computeFrenchDrain({
        unit,
        length: num(length),
        width: num(width) ?? 12,
        depth: num(depth) ?? 18,
        pipeDiameter: num(pipeDiameter) ?? 4,
      }),
    [unit, length, width, depth, pipeDiameter],
  );

  const lenUnit = unit === "ft" ? tc("unitFt") : tc("unitM");
  const smallUnit = unit === "ft" ? tc("unitIn") : tc("unitCm");
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={tc("units")}>
              <Select value={unit} onValueChange={(v) => setUnit(v as LenUnit)}>
                <SelectTrigger aria-label={tc("units")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ft">{tc("unitsImperial")}</SelectItem>
                  <SelectItem value="m">{tc("unitsMetric")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <NumberField id="len" label={`${tc("length")} (${lenUnit})`} value={length} onChange={setLength} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberField id="w" label={`${t("width")} (${smallUnit})`} value={width} onChange={setWidth} />
            <NumberField id="d" label={`${t("depth")} (${smallUnit})`} value={depth} onChange={setDepth} />
            <NumberField id="p" label={`${t("pipeDiameter")} (${smallUnit})`} value={pipeDiameter} onChange={setPipeDiameter} />
          </div>
        </form>

        <ToolResult
          hasResult={Boolean(result)}
          range={result ? { low: result.gravelCuYd, high: result.gravelCuYd } : undefined}
          unitLabel={t("gravelUnit")}
          stats={
            result
              ? [
                  { label: t("tonsLabel"), value: t("tonsValue", { n: result.gravelTons }) },
                  { label: t("pipeLabel"), value: t("pipeValue", { n: result.pipeFt }) },
                  { label: t("fabricLabel"), value: t("fabricValue", { n: result.fabricSqft }) },
                  { label: t("dropLabel"), value: t("dropValue", { n: result.minDropFt }) },
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
