"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeRetainingWall } from "@/domain/toolbox/retainingWall";
import { Switch } from "@/components/ui/switch";
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

export function RetainingWallCalculator() {
  const t = useTranslations("Tools.retainingWall");
  const tc = useTranslations("Toolbox.common");

  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [blockFace, setBlockFace] = useState("12");
  const [blockHeight, setBlockHeight] = useState("6");
  const [capRow, setCapRow] = useState(true);

  const result = useMemo(
    () =>
      computeRetainingWall({
        unit,
        length: num(length),
        height: num(height),
        blockFace: num(blockFace) ?? 12,
        blockHeight: num(blockHeight) ?? 6,
        capRow,
      }),
    [unit, length, height, blockFace, blockHeight, capRow],
  );

  const lenUnit = unit === "ft" ? tc("unitFt") : tc("unitM");
  const smallUnit = unit === "ft" ? tc("unitIn") : tc("unitCm");
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
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
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="len" label={`${tc("length")} (${lenUnit})`} value={length} onChange={setLength} />
            <NumberField id="h" label={`${t("height")} (${lenUnit})`} value={height} onChange={setHeight} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="bf" label={`${t("blockFace")} (${smallUnit})`} value={blockFace} onChange={setBlockFace} />
            <NumberField id="bh" label={`${t("blockHeight")} (${smallUnit})`} value={blockHeight} onChange={setBlockHeight} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <Switch checked={capRow} onCheckedChange={setCapRow} />
            {t("capRow")}
          </label>
        </form>

        <ToolResult
          hasResult={Boolean(result)}
          range={result ? { low: result.blocks, high: result.blocksWithWaste } : undefined}
          unitLabel={t("blocksUnit")}
          note={result ? t("recommend") : undefined}
          stats={
            result
              ? [
                  { label: t("coursesLabel"), value: String(result.courses) },
                  { label: t("perCourseLabel"), value: String(result.perCourse) },
                  { label: t("capLabel"), value: String(result.capBlocks) },
                  {
                    label: t("gravelLabel"),
                    value: t("gravelValue", {
                      cuYd: result.baseGravelCuYd + result.drainGravelCuYd,
                      tons: result.gravelTons,
                    }),
                  },
                ]
              : undefined
          }
          assumptions={result ? [t("wasteNote"), t("gravelNote"), tc("disclaimer")] : undefined}
          emptyTitle={t("emptyTitle")}
          emptyBody={t("emptyBody")}
        />
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
