"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Ruler } from "lucide-react";

import { computeRaisedBed, type BlendPart } from "@/domain/toolbox/raisedBed";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  NumberField,
  ToolExplainer,
  num,
  type LenUnit,
} from "@/components/toolbox/_shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RaisedBedCalculator() {
  const t = useTranslations("Tools.raisedBed");
  const tc = useTranslations("Toolbox.common");

  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("12");
  const [topsoilPct, setTopsoilPct] = useState("60");
  const [compostPct, setCompostPct] = useState("30");
  const [aerationPct, setAerationPct] = useState("10");

  const result = useMemo(() => {
    const h = num(height);
    if (!h) return null;
    return computeRaisedBed({
      unit,
      length: num(length),
      width: num(width),
      height: h,
      topsoilPct: num(topsoilPct) ?? 0,
      compostPct: num(compostPct) ?? 0,
      aerationPct: num(aerationPct) ?? 0,
    });
  }, [unit, length, width, height, topsoilPct, compostPct, aerationPct]);

  const lenUnit = unit === "ft" ? tc("unitFt") : tc("unitM");
  const depthUnit = unit === "ft" ? tc("unitIn") : tc("unitCm");
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];
  const pctSum = (num(topsoilPct) ?? 0) + (num(compostPct) ?? 0) + (num(aerationPct) ?? 0);

  const parts: { label: string; part: BlendPart }[] = result
    ? [
        { label: t("topsoil"), part: result.topsoil },
        { label: t("compost"), part: result.compost },
        { label: t("aeration"), part: result.aeration },
      ]
    : [];

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
            <NumberField id="wid" label={`${tc("width")} (${lenUnit})`} value={width} onChange={setWidth} />
          </div>
          <NumberField id="h" label={`${t("height")} (${depthUnit})`} value={height} onChange={setHeight} />
          <div className="grid grid-cols-3 gap-3">
            <NumberField id="ts" label={t("topsoilPct")} value={topsoilPct} onChange={setTopsoilPct} />
            <NumberField id="cp" label={t("compostPct")} value={compostPct} onChange={setCompostPct} />
            <NumberField id="ae" label={t("aerationPct")} value={aerationPct} onChange={setAerationPct} />
          </div>
        </form>

        <div className="flex flex-col gap-4">
          {result ? (
            <>
              <div className="rounded-2xl border border-border bg-surface p-6">
                <p className="eyebrow text-brand">{t("total")}</p>
                <p className="numeric display-lg mt-1 text-foreground">
                  {result.totalCuYd} <span className="text-base text-muted-foreground">{tc("cuYd")}</span>
                </p>
                <dl className="mt-4 flex flex-col gap-2 border-t border-border pt-4 text-sm">
                  {parts.map(({ label, part }) => (
                    <div key={label} className="flex items-baseline justify-between gap-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="numeric font-medium text-foreground">
                        {part.cuFt} {tc("unitCuFt")} · {t("bagsValue", { n: part.bags })}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              {result.pctOff ? (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" aria-hidden />
                  <AlertDescription>{t("pctWarn", { sum: Math.round(pctSum) })}</AlertDescription>
                </Alert>
              ) : null}
              <p className="text-xs text-muted-foreground">{tc("disclaimer")}</p>
            </>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
              <Ruler className="size-7 text-muted-foreground" aria-hidden />
              <p className="mt-2 text-base font-medium text-foreground">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
            </div>
          )}
        </div>
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
