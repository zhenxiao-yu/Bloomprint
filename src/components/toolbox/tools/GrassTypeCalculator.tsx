"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import {
  recommendGrass,
  type GrassRegion,
  type GrassSun,
  type GrassTraffic,
} from "@/domain/toolbox/grassType";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, ToolExplainer } from "@/components/toolbox/_shared";

const REGIONS: GrassRegion[] = ["cool", "transition", "warm"];
const SUNS: GrassSun[] = ["full", "part", "shade"];
const TRAFFICS: GrassTraffic[] = ["low", "medium", "high"];

export function GrassTypeCalculator() {
  const t = useTranslations("Tools.grassType");

  const [region, setRegion] = useState<GrassRegion>("cool");
  const [sun, setSun] = useState<GrassSun>("full");
  const [traffic, setTraffic] = useState<GrassTraffic>("medium");
  const [lowWater, setLowWater] = useState(false);

  const result = useMemo(() => recommendGrass({ region, sun, traffic, lowWater }), [region, sun, traffic, lowWater]);
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Field label={t("region")}>
            <Select value={region} onValueChange={(v) => setRegion(v as GrassRegion)}>
              <SelectTrigger aria-label={t("region")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`region_${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("sun")}>
              <Select value={sun} onValueChange={(v) => setSun(v as GrassSun)}>
                <SelectTrigger aria-label={t("sun")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUNS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`sun_${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("traffic")}>
              <Select value={traffic} onValueChange={(v) => setTraffic(v as GrassTraffic)}>
                <SelectTrigger aria-label={t("traffic")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRAFFICS.map((x) => (
                    <SelectItem key={x} value={x}>
                      {t(`traffic_${x}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
            <Switch checked={lowWater} onCheckedChange={setLowWater} />
            {t("lowWater")}
          </label>
        </form>

        <div className="flex flex-col gap-2">
          {result.matches.length > 0 ? (
            result.matches.map((m, i) => (
              <div
                key={m.key}
                className={`flex flex-col gap-1.5 rounded-2xl border p-4 ${
                  i === 0 ? "border-brand/40 bg-brand-soft/40" : "border-border bg-surface"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-foreground">{t(`grass_${m.key}`)}</p>
                  {i === 0 ? <Badge className="bg-brand text-on-strong">{t("bestPick")}</Badge> : null}
                </div>
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {m.toleratesSun ? <Trait label={t("sunOk")} /> : null}
                  {m.toleratesTraffic ? <Trait label={t("trafficOk")} /> : null}
                  {m.lowWater ? <Trait label={t("lowWaterTrait")} /> : null}
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-6 text-center text-sm text-muted-foreground">
              {t("noMatches")}
            </p>
          )}
        </div>
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}

function Trait({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-trust/10 px-2 py-0.5 font-medium text-trust">
      <Check className="size-3" aria-hidden />
      {label}
    </span>
  );
}
