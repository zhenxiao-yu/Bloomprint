"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Ruler } from "lucide-react";

import { computeMulch, type MulchShape, type MulchUnit } from "@/domain/toolbox/mulch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Disclosure } from "@/components/ui/disclosure";

/** Parse a numeric text field to a positive number, or undefined when blank/invalid. */
function num(v: string): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
}

const BAG_SIZES = [1.5, 2, 3] as const;

/**
 * Mulch Calculator — the first Landscape Toolbox tool. Deterministic, works with no AI or
 * network. Shows a bag RANGE (exact → recommended-with-buffer), the depth-safety caution,
 * and every assumption. All math lives in the framework-free domain (`computeMulch`).
 */
export function MulchCalculator() {
  const t = useTranslations("Toolbox");

  const [shape, setShape] = useState<MulchShape>("rectangle");
  const [unit, setUnit] = useState<MulchUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [area, setArea] = useState("");
  const [depth, setDepth] = useState(unit === "ft" ? "2" : "5");
  const [bagSize, setBagSize] = useState<number>(2);
  const [extraPct, setExtraPct] = useState("10");

  const result = useMemo(() => {
    const depthN = num(depth);
    if (!depthN) return null;
    return computeMulch({
      shape,
      unit,
      length: num(length),
      width: num(width),
      radius: num(radius),
      area: num(area),
      depth: depthN,
      bagSizeCuFt: bagSize,
      extraPct: num(extraPct) ?? 0,
    });
  }, [shape, unit, length, width, radius, area, depth, bagSize, extraPct]);

  const lenUnit = unit === "ft" ? t("unitFt") : t("unitM");
  const depthUnit = unit === "ft" ? t("unitIn") : t("unitCm");
  const areaUnit = unit === "ft" ? t("unitSqFt") : t("unitSqM");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* ---- Inputs ---- */}
      <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("shape")}>
            <Select value={shape} onValueChange={(v) => setShape(v as MulchShape)}>
              <SelectTrigger aria-label={t("shape")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rectangle">{t("shapeRectangle")}</SelectItem>
                <SelectItem value="circle">{t("shapeCircle")}</SelectItem>
                <SelectItem value="area">{t("shapeArea")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("units")}>
            <Select value={unit} onValueChange={(v) => setUnit(v as MulchUnit)}>
              <SelectTrigger aria-label={t("units")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ft">{t("unitsImperial")}</SelectItem>
                <SelectItem value="m">{t("unitsMetric")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {shape === "rectangle" && (
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="len" label={`${t("length")} (${lenUnit})`} value={length} onChange={setLength} />
            <NumberField id="wid" label={`${t("width")} (${lenUnit})`} value={width} onChange={setWidth} />
          </div>
        )}
        {shape === "circle" && (
          <NumberField id="rad" label={`${t("radius")} (${lenUnit})`} value={radius} onChange={setRadius} />
        )}
        {shape === "area" && (
          <NumberField id="area" label={`${t("area")} (${areaUnit})`} value={area} onChange={setArea} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <NumberField id="depth" label={`${t("depth")} (${depthUnit})`} value={depth} onChange={setDepth} />
          <Field label={t("extra")}>
            <div className="relative">
              <Input
                inputMode="numeric"
                value={extraPct}
                onChange={(e) => setExtraPct(e.target.value)}
                className="pr-8"
                aria-label={t("extra")}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">%</span>
            </div>
          </Field>
        </div>

        <Field label={t("bagSize")}>
          <Select value={String(bagSize)} onValueChange={(v) => setBagSize(Number(v))}>
            <SelectTrigger aria-label={t("bagSize")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BAG_SIZES.map((b) => (
                <SelectItem key={b} value={String(b)}>
                  {t("bagSizeValue", { size: b })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </form>

      {/* ---- Result ---- */}
      <div className="flex flex-col gap-4">
        {result ? (
          <>
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="eyebrow text-brand">{t("youNeed")}</p>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="numeric display-lg text-foreground">
                  {result.range.low === result.range.high
                    ? result.range.low
                    : `${result.range.low}–${result.range.high}`}
                </span>
                <span className="text-base text-muted-foreground">{t("bags")}</span>
              </p>
              <p className="mt-1 text-base text-muted-foreground">
                {t("recommendedBags", { count: result.bagsWithExtra })}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
                <Stat label={t("bedArea")} value={`${result.areaSqft} ${areaUnitFt(t)}`} />
                <Stat label={t("volume")} value={`${result.volumeCuFt} ${t("unitCuFt")}`} />
              </dl>
            </div>

            {result.depthTooDeep && (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" aria-hidden />
                <AlertTitle>{t("depthWarningTitle")}</AlertTitle>
                <AlertDescription>{t("depthWarningBody")}</AlertDescription>
              </Alert>
            )}

            <Disclosure title={t("assumptionsTitle")} summary={t("assumptionsSummary")}>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li>{t("assumeBag", { size: result.bagSizeCuFt })}</li>
                <li>{t("assumeDepth", { depth: result.depthInches })}</li>
                <li>{t("assumeBuffer", { pct: result.recommendedExtraPct })}</li>
                <li>{t("disclaimer")}</li>
              </ul>
            </Disclosure>

            {/* "Ask AI" is an optional enhancement — the calculator is fully usable without it. */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled title={t("aiSoonHint")}>
                {t("askAi")}
              </Button>
              <Button variant="ghost" size="sm" disabled title={t("applySoonHint")}>
                {t("applyToPlan")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("optionalNote")}</p>
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
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
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

// Area is always reported in sq ft internally; show the imperial area label for clarity.
function areaUnitFt(t: ReturnType<typeof useTranslations>): string {
  return t("unitSqFt");
}
