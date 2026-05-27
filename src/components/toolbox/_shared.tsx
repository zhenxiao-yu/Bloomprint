"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Ruler } from "lucide-react";

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

/**
 * Shared building blocks for Landscape Toolbox calculators — extracted from the original
 * MulchCalculator so every tool gets the same mobile-first form/result/assumptions UI and
 * honest range display. Tool-specific copy comes from `Tools.<slug>`; shared chrome
 * (units, shape, assumptions, disclaimer, empty state) comes from `Toolbox.common`.
 */

/** Parse a numeric text field to a positive number, or undefined when blank/invalid. */
export function num(v: string): number | undefined {
  const n = Number(v);
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : undefined;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric font-medium text-foreground">{value}</dd>
    </div>
  );
}

export type Shape = "rectangle" | "circle" | "area";
export type LenUnit = "ft" | "m";

/**
 * Unit-aware shape + dimensions input group (rectangle / circle / known-area), shared by every
 * area-based calculator. Linear inputs are in `unit`; `area` is in unit². Depth and other
 * tool-specific fields are added by the calculator itself.
 */
export function DimensionGroup({
  shape,
  unit,
  length,
  width,
  radius,
  area,
  onShape,
  onUnit,
  onLength,
  onWidth,
  onRadius,
  onArea,
}: {
  shape: Shape;
  unit: LenUnit;
  length: string;
  width: string;
  radius: string;
  area: string;
  onShape: (v: Shape) => void;
  onUnit: (v: LenUnit) => void;
  onLength: (v: string) => void;
  onWidth: (v: string) => void;
  onRadius: (v: string) => void;
  onArea: (v: string) => void;
}) {
  const t = useTranslations("Toolbox.common");
  const lenUnit = unit === "ft" ? t("unitFt") : t("unitM");
  const areaUnit = unit === "ft" ? t("unitSqFt") : t("unitSqM");
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("shape")}>
          <Select value={shape} onValueChange={(v) => onShape(v as Shape)}>
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
          <Select value={unit} onValueChange={(v) => onUnit(v as LenUnit)}>
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
          <NumberField id="len" label={`${t("length")} (${lenUnit})`} value={length} onChange={onLength} />
          <NumberField id="wid" label={`${t("width")} (${lenUnit})`} value={width} onChange={onWidth} />
        </div>
      )}
      {shape === "circle" && (
        <NumberField id="rad" label={`${t("radius")} (${lenUnit})`} value={radius} onChange={onRadius} />
      )}
      {shape === "area" && (
        <NumberField id="area" label={`${t("area")} (${areaUnit})`} value={area} onChange={onArea} />
      )}
    </>
  );
}

export interface ResultStat {
  label: string;
  value: string;
}
export interface ResultWarning {
  title: string;
  body: string;
}

/**
 * Shared result panel: an honest low–high range headline, optional note + stats, destructive
 * warning Alerts, an assumptions Disclosure, the toolbox disclaimer, and the (disabled)
 * Ask-AI / Add-to-plan affordances. Renders an empty/prompt state when `hasResult` is false.
 */
export function ToolResult({
  hasResult,
  range,
  unitLabel,
  note,
  stats,
  warnings,
  assumptions,
  emptyTitle,
  emptyBody,
}: {
  hasResult: boolean;
  range?: { low: number; high: number };
  unitLabel?: string;
  note?: string;
  stats?: ResultStat[];
  warnings?: ResultWarning[];
  assumptions?: string[];
  emptyTitle: string;
  emptyBody: string;
}) {
  const t = useTranslations("Toolbox.common");

  if (!hasResult || !range) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface-muted/40 p-6 text-center">
        <Ruler className="size-7 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-base font-medium text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="eyebrow text-brand">{t("youNeed")}</p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="numeric display-lg text-foreground">
            {range.low === range.high ? range.low : `${range.low}–${range.high}`}
          </span>
          {unitLabel ? <span className="text-base text-muted-foreground">{unitLabel}</span> : null}
        </p>
        {note ? <p className="mt-1 text-base text-muted-foreground">{note}</p> : null}
        {stats && stats.length > 0 ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
            {stats.map((s) => (
              <Stat key={s.label} label={s.label} value={s.value} />
            ))}
          </dl>
        ) : null}
      </div>

      {warnings?.map((w) => (
        <Alert key={w.title} variant="destructive">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertTitle>{w.title}</AlertTitle>
          <AlertDescription>{w.body}</AlertDescription>
        </Alert>
      ))}

      {assumptions && assumptions.length > 0 ? (
        <Disclosure title={t("assumptionsTitle")} summary={t("assumptionsSummary")}>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </Disclosure>
      ) : null}

      {/* Optional enhancements — every calculator is fully usable without them. */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled title={t("aiSoonHint")}>
          {t("askAi")}
        </Button>
        <Button variant="ghost" size="sm" disabled title={t("applySoonHint")}>
          {t("applyToPlan")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("optionalNote")}</p>
    </div>
  );
}
