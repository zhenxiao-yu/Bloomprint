"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { computeSeedStarting, type DateMD } from "@/domain/toolbox/seedStarting";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, NumberField, ToolExplainer, num } from "@/components/toolbox/_shared";

export function SeedStartingCalculator() {
  const t = useTranslations("Tools.seedStarting");
  const locale = useLocale();
  const intlLocale = locale === "zh" ? "zh-CN" : "en-US";

  const [month, setMonth] = useState("5");
  const [day, setDay] = useState("15");

  const result = useMemo(() => {
    const m = num(month);
    const d = num(day);
    if (!m || !d || m > 12 || d > 31) return null;
    return computeSeedStarting({ frostMonth: Math.round(m), frostDay: Math.round(d) });
  }, [month, day]);

  const monthNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intlLocale, { month: "long" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2025, i, 1)));
  }, [intlLocale]);
  const dateFmt = useMemo(() => new Intl.DateTimeFormat(intlLocale, { month: "short", day: "numeric" }), [intlLocale]);
  const fmt = (md?: DateMD) => (md ? dateFmt.format(new Date(2025, md.month - 1, md.day)) : "—");

  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-wrap items-end gap-4" onSubmit={(e) => e.preventDefault()}>
        <Field label={t("frostMonth")}>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger aria-label={t("frostMonth")} className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <div className="w-24">
          <NumberField id="frost-day" label={t("frostDay")} value={day} onChange={setDay} />
        </div>
        <p className="basis-full text-xs text-muted-foreground">{t("frostHint")}</p>
      </form>

      {result ? (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted/40 text-left">
                <th className="px-3 py-2 font-semibold text-foreground">{t("colCrop")}</th>
                <th className="px-3 py-2 font-semibold text-foreground">{t("indoorSow")}</th>
                <th className="px-3 py-2 font-semibold text-foreground">{t("transplant")}</th>
                <th className="px-3 py-2 font-semibold text-foreground">{t("directSow")}</th>
              </tr>
            </thead>
            <tbody>
              {result.crops.map((c) => (
                <tr key={c.key} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{t(`crop_${c.key}`)}</td>
                  <td className="numeric px-3 py-2 text-muted-foreground">{fmt(c.indoorSow)}</td>
                  <td className="numeric px-3 py-2 text-muted-foreground">{fmt(c.transplant)}</td>
                  <td className="numeric px-3 py-2 text-muted-foreground">{fmt(c.directSow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
          <p className="text-base font-medium text-foreground">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("emptyBody")}</p>
        </div>
      )}

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
