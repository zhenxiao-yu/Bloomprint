"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeJobQuote, type JobService } from "@/domain/toolbox/jobQuote";
import { usePreferences } from "@/lib/preferencesStore";
import { Ruler } from "lucide-react";
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
  num,
  type LenUnit,
} from "@/components/toolbox/_shared";

const SERVICES: JobService[] = ["plantingBed", "sod", "mulch", "paverPatio", "lawnSeed", "cleanup"];

export function JobQuoteCalculator() {
  const t = useTranslations("Tools.jobQuote");
  const tc = useTranslations("Toolbox.common");
  const prefs = usePreferences();
  const currency = prefs.currency ?? "USD";

  const [unit, setUnit] = useState<LenUnit>("ft");
  const [area, setArea] = useState("");
  const [service, setService] = useState<JobService>("plantingBed");
  const [crewRate, setCrewRate] = useState("65");
  const [margin, setMargin] = useState("30");

  const result = useMemo(
    () =>
      computeJobQuote({
        unit,
        area: num(area),
        service,
        crewRate: num(crewRate) ?? 65,
        marginPct: Math.min(200, num(margin) ?? 30),
      }),
    [unit, area, service, crewRate, margin],
  );

  const money = (n: number) => `$${n.toLocaleString()}`;
  const range = (low: number, high: number) =>
    low === high ? money(low) : `${money(low)}–${money(high)}`;
  const areaUnit = unit === "ft" ? tc("unitSqFt") : tc("unitSqM");
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
            <NumberField id="area" label={`${t("areaLabel")} (${areaUnit})`} value={area} onChange={setArea} />
          </div>
          <Field label={t("service")}>
            <Select value={service} onValueChange={(v) => setService(v as JobService)}>
              <SelectTrigger aria-label={t("service")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`service_${s}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="rate" label={t("crewRate")} value={crewRate} onChange={setCrewRate} />
            <NumberField id="margin" label={t("margin")} value={margin} onChange={setMargin} />
          </div>
        </form>

        <div className="flex flex-col gap-4">
          {result ? (
            <>
              <div className="rounded-2xl border border-border bg-surface p-6">
                <p className="eyebrow text-brand">{t("priceTitle")}</p>
                <p className="mt-1 flex flex-wrap items-baseline gap-2">
                  <span className="numeric display-lg text-foreground">{range(result.price.low, result.price.high)}</span>
                  <span className="text-base text-muted-foreground">{currency}</span>
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                  <Stat label={t("hoursLabel")} value={`${result.hours} h`} />
                  <Stat label={t("laborLabel")} value={money(result.laborCost)} />
                  <Stat label={t("materialLabel")} value={range(result.material.low, result.material.high)} />
                  <Stat label={t("perSqftLabel")} value={range(result.perSqft.low, result.perSqft.high)} />
                </dl>
              </div>
              <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric font-medium text-foreground">{value}</dd>
    </div>
  );
}
