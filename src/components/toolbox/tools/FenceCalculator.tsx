"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeFence, type FenceStyle } from "@/domain/toolbox/fence";
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

export function FenceCalculator() {
  const t = useTranslations("Tools.fence");
  const tc = useTranslations("Toolbox.common");

  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [postSpacing, setPostSpacing] = useState("8");
  const [gates, setGates] = useState("0");
  const [style, setStyle] = useState<FenceStyle>("panel");

  const result = useMemo(
    () =>
      computeFence({
        unit,
        length: num(length),
        postSpacing: num(postSpacing) ?? 8,
        gates: Math.min(20, Math.round(num(gates) ?? 0)),
        style,
      }),
    [unit, length, postSpacing, gates, style],
  );

  const lenUnit = unit === "ft" ? tc("unitFt") : tc("unitM");
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  const stats = result
    ? [
        { label: t("sectionsLabel"), value: String(result.sections) },
        { label: t("railsLabel"), value: String(result.rails) },
        result.panels !== null
          ? { label: t("panelsLabel"), value: String(result.panels) }
          : { label: t("picketsLabel"), value: String(result.pickets ?? 0) },
        { label: t("concreteLabel"), value: String(result.concreteBags) },
      ]
    : undefined;

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
            <Field label={t("style")}>
              <Select value={style} onValueChange={(v) => setStyle(v as FenceStyle)}>
                <SelectTrigger aria-label={t("style")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="panel">{t("style_panel")}</SelectItem>
                  <SelectItem value="picket">{t("style_picket")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <NumberField id="len" label={`${tc("length")} (${lenUnit})`} value={length} onChange={setLength} />
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="sp" label={`${t("postSpacing")} (${lenUnit})`} value={postSpacing} onChange={setPostSpacing} />
            <NumberField id="g" label={t("gates")} value={gates} onChange={setGates} />
          </div>
        </form>

        <ToolResult
          hasResult={Boolean(result)}
          range={result ? { low: result.posts, high: result.posts } : undefined}
          unitLabel={t("postsUnit")}
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
