"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  findPlants,
  type PlantMatch,
  type SunFilter,
  type TypeFilter,
  type WaterFilter,
} from "@/domain/toolbox/plantFinder";
import { localizePlantName } from "@/lib/plantNames";
import { Input } from "@/components/ui/input";
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

const SUN_OPTS: SunFilter[] = ["any", "full-sun", "part-sun", "shade"];
const WATER_OPTS: WaterFilter[] = ["any", "low", "medium", "high"];
const TYPE_OPTS: TypeFilter[] = ["any", "evergreen", "shrub", "perennial", "grass", "tree", "groundcover"];

const CM_PER_FT = 30.48;
const ft = (cm: number) => Math.round((cm / CM_PER_FT) * 10) / 10;

/** Filter + rank the Core Library by real conditions. Not a calculator — a curated plant query. */
export function PlantFinderCalculator() {
  const t = useTranslations("Tools.plantFinder");
  const locale = useLocale();

  const [zone, setZone] = useState("");
  const [sun, setSun] = useState<SunFilter>("any");
  const [water, setWater] = useState<WaterFilter>("any");
  const [type, setType] = useState<TypeFilter>("any");
  const [petSafe, setPetSafe] = useState(false);
  const [deerResistant, setDeerResistant] = useState(false);
  const [saltTolerant, setSaltTolerant] = useState(false);

  const zoneNum = (() => {
    const n = Number(zone);
    return zone.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 13 ? n : undefined;
  })();

  const result = useMemo(
    () => findPlants({ zone: zoneNum, sun, water, type, petSafe, deerResistant, saltTolerant }),
    [zoneNum, sun, water, type, petSafe, deerResistant, saltTolerant],
  );

  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  function reasons(m: PlantMatch): string[] {
    const out: string[] = [];
    if (m.matchedZone && zoneNum !== undefined) out.push(t("reasonZone", { zone: zoneNum }));
    if (m.matchedSun) out.push(t("reasonSun", { sun: t(`sun_${sun}`) }));
    if (m.matchedWater) out.push(t("reasonWater", { water: shortWater(m.water) }));
    if (m.deerResistant) out.push(t("reasonDeer"));
    if (m.saltTolerant) out.push(t("reasonSalt"));
    if (m.maintenance === "low") out.push(t("reasonLowMaint"));
    return out;
  }
  function shortWater(w: PlantMatch["water"]): string {
    return t(`water_${w}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()}>
        <Field label={t("zone")}>
          <Input
            inputMode="numeric"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder={t("zonePlaceholder")}
            aria-label={t("zone")}
          />
        </Field>
        <Field label={t("sun")}>
          <Select value={sun} onValueChange={(v) => setSun(v as SunFilter)}>
            <SelectTrigger aria-label={t("sun")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUN_OPTS.map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`sun_${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("water")}>
          <Select value={water} onValueChange={(v) => setWater(v as WaterFilter)}>
            <SelectTrigger aria-label={t("water")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WATER_OPTS.map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`water_${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("type")}>
          <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
            <SelectTrigger aria-label={t("type")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTS.map((o) => (
                <SelectItem key={o} value={o}>
                  {t(`type_${o}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2 lg:col-span-4">
          <Toggle label={t("petSafe")} checked={petSafe} onChange={setPetSafe} />
          <Toggle label={t("deerResistant")} checked={deerResistant} onChange={setDeerResistant} />
          <Toggle label={t("saltTolerant")} checked={saltTolerant} onChange={setSaltTolerant} />
        </div>
      </form>

      <p className="text-sm text-muted-foreground">
        {t("showing", { shown: result.matches.length, total: result.total })}
      </p>

      {result.matches.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.matches.map((m) => (
            <article key={m.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <div>
                <p className="text-base font-semibold text-foreground">
                  {localizePlantName(m.id, m.commonName, locale)}
                </p>
                <p className="text-xs italic text-muted-foreground">{m.botanicalName}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reasons(m).map((r) => (
                  <span
                    key={r}
                    className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-strong"
                  >
                    {r}
                  </span>
                ))}
                {m.toxicToPetsOrKids ? (
                  <Badge variant="outline" className="border-warn/40 text-[11px] text-warn">
                    {t("cautionToxic")}
                  </Badge>
                ) : null}
                {m.invasive ? (
                  <Badge variant="outline" className="border-danger/40 text-[11px] text-danger">
                    {t("cautionInvasive")}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-auto text-xs text-muted-foreground">
                {t("matureSize", { h: ft(m.matureHeightCm), w: ft(m.matureWidthCm) })}
              </p>
              <p className="numeric text-sm font-medium text-foreground">
                ${m.unitPrice.min}–${m.unitPrice.max}{" "}
                <span className="text-xs font-normal text-muted-foreground">{t("perPlant")}</span>
              </p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border bg-surface-muted/30 p-6 text-center text-sm text-muted-foreground">
          {t("noMatches")}
        </p>
      )}

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-foreground">
      <Switch checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
