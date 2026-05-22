"use client";

/**
 * Yard Map builder — an optional, clearly-labeled tool for marking zones on a
 * photo (or a blank board) and getting ROUGH area / material estimates.
 *
 * This is concept placement, not survey-grade measurement. Every number is
 * shown with MEASUREMENT_DISCLAIMER. The whole tool works with no photo, no AI,
 * and no network.
 *
 * The konva canvas is dynamically imported with ssr:false so it never runs on
 * the server (konva needs `window`).
 */
import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { YardZoneType, createZone, polygonAreaNormalized } from "@/lib/yard-map/zoneModel";
import type { YardZone } from "@/lib/yard-map/zoneModel";
import {
  MEASUREMENT_DISCLAIMER,
  estimateMaterialsFromArea,
  scaleNormalizedArea,
} from "@/lib/yard-map/measurement";
import type { Calibration } from "@/lib/yard-map/measurement";
import { normalizedLineLengthPx } from "@/lib/yard-map/rectGeometry";
import type { CalibrationLine, CanvasMode } from "./YardZoneCanvas";

// Canvas is client-only: konva needs `window`, so never render it on the server.
const YardZoneCanvas = dynamic(() => import("./YardZoneCanvas"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full animate-pulse rounded-xl border border-border bg-surface"
      style={{ aspectRatio: "5 / 3" }}
    />
  ),
});

const ZONE_TYPES = YardZoneType.options;
type Unit = "ft" | "m";

export function YardMapBuilder({ photoUrl: initialPhoto = null }: { photoUrl?: string | null }) {
  const t = useTranslations("YardMap");

  const [zones, setZones] = useState<YardZone[]>([]);
  const [activeZoneType, setActiveZoneType] = useState<(typeof ZONE_TYPES)[number]>("planting_bed");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [mode, setMode] = useState<CanvasMode>("zone");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhoto);

  const [calLine, setCalLine] = useState<CalibrationLine | null>(null);
  const [knownLength, setKnownLength] = useState<string>("");
  const [unit, setUnit] = useState<Unit>("ft");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const fileRef = useRef<HTMLInputElement>(null);

  const handleStageSize = useCallback(
    (s: { width: number; height: number }) => setStageSize(s),
    [],
  );

  const handleAddZone = useCallback(
    (points: { x: number; y: number }[]) => {
      setZones((prev) => [...prev, createZone({ type: activeZoneType, points })]);
    },
    [activeZoneType],
  );

  const handleCalibrationLine = useCallback((line: CalibrationLine) => {
    setCalLine(line);
    setMode("zone");
  }, []);

  function deleteZone(id: string) {
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (selectedZoneId === id) setSelectedZoneId(null);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Build a Calibration once we have both a drawn line and a positive length.
  const calibration: Calibration | null = useMemo(() => {
    const len = Number(knownLength);
    if (!calLine || !Number.isFinite(len) || len <= 0) return null;
    const pixelLength = normalizedLineLengthPx(
      calLine.a,
      calLine.b,
      stageSize.width,
      stageSize.height,
    );
    if (pixelLength <= 0) return null;
    return { pixelLength, realLength: len, unit };
  }, [calLine, knownLength, unit, stageSize.width, stageSize.height]);

  // Per-zone real area, only when calibrated.
  const zoneAreas = useMemo(() => {
    if (!calibration) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const z of zones) {
      const areaNorm = polygonAreaNormalized(z.points);
      const sqUnits = scaleNormalizedArea(
        areaNorm,
        stageSize.width,
        stageSize.height,
        calibration,
      );
      map.set(z.id, sqUnits);
    }
    return map;
  }, [zones, calibration, stageSize.width, stageSize.height]);

  // Aggregate bed area (planting beds) → material estimate.
  const bedArea = useMemo(() => {
    if (!calibration) return 0;
    return zones
      .filter((z) => z.type === "planting_bed")
      .reduce((sum, z) => sum + (zoneAreas.get(z.id) ?? 0), 0);
  }, [zones, zoneAreas, calibration]);

  // Materials are computed in ft²; convert m² → ft² so the engine math holds.
  const M2_TO_FT2 = 10.7639;
  const bedAreaSqft = unit === "m" ? bedArea * M2_TO_FT2 : bedArea;
  const materials = calibration && bedAreaSqft > 0 ? estimateMaterialsFromArea(bedAreaSqft) : null;

  const areaUnitLabel = unit === "ft" ? t("unitSqFt") : t("unitSqM");

  return (
    <div className="space-y-5">
      {/* Header + beta tag */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">
            {t("beta")}
          </span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("instructions")}</p>
      </div>

      {/* Toolbar: photo, zone-type picker, calibrate toggle */}
      <div className="card space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand"
          >
            {photoUrl ? t("changePhoto") : t("addPhoto")}
          </button>
          {photoUrl ? (
            <button
              type="button"
              onClick={() => setPhotoUrl(null)}
              className="text-xs text-muted hover:text-foreground"
            >
              {t("removePhoto")}
            </button>
          ) : (
            <span className="text-xs text-muted">{t("noPhotoNote")}</span>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">{t("zoneTypeLabel")}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("zoneTypeLabel")}>
            {ZONE_TYPES.map((zt) => {
              const active = activeZoneType === zt;
              return (
                <button
                  key={zt}
                  type="button"
                  onClick={() => {
                    setActiveZoneType(zt);
                    setMode("zone");
                  }}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-brand text-on-strong"
                      : "border border-border text-foreground hover:border-brand"
                  }`}
                >
                  {t(`zoneTypes.${zt}`)}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {mode === "zone" ? t("drawHint") : t("calibrateHint")}
          </p>
        </div>
      </div>

      {/* Canvas */}
      <YardZoneCanvas
        zones={zones}
        activeZoneType={activeZoneType}
        mode={mode}
        selectedZoneId={selectedZoneId}
        photoUrl={photoUrl}
        calibrationLine={calLine}
        onStageSize={handleStageSize}
        onAddZone={handleAddZone}
        onSelectZone={setSelectedZoneId}
        onCalibrationLine={handleCalibrationLine}
      />

      {selectedZoneId ? (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">{t("selectedZone")}</span>
          <button
            type="button"
            onClick={() => deleteZone(selectedZoneId)}
            className="rounded-full border border-[var(--warn)] px-3 py-1 text-xs font-medium text-[var(--warn)] transition hover:bg-[var(--warn)]/10"
          >
            {t("deleteZone")}
          </button>
        </div>
      ) : null}

      {/* Calibration controls */}
      <div className="card space-y-3 p-4">
        <h2 className="text-base font-semibold text-foreground">{t("calibrateTitle")}</h2>
        <p className="text-sm text-muted">{t("calibrateInstructions")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={() => setMode(mode === "calibrate" ? "zone" : "calibrate")}
            aria-pressed={mode === "calibrate"}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              mode === "calibrate"
                ? "bg-brand text-on-strong"
                : "border border-border text-foreground hover:border-brand"
            }`}
          >
            {mode === "calibrate" ? t("calibrateDrawing") : t("calibrateDraw")}
          </button>

          <label className="flex flex-col text-xs text-muted">
            {t("lengthLabel")}
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={knownLength}
              onChange={(e) => setKnownLength(e.target.value)}
              placeholder={t("lengthPlaceholder")}
              className="mt-1 w-28 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
            />
          </label>

          <div
            className="flex overflow-hidden rounded-full border border-border text-xs"
            role="group"
            aria-label={t("unitLabel")}
          >
            {(["ft", "m"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`px-3 py-1.5 font-medium transition ${
                  unit === u ? "bg-brand text-on-strong" : "text-foreground hover:bg-brand-soft"
                }`}
              >
                {u === "ft" ? t("unitFt") : t("unitM")}
              </button>
            ))}
          </div>
        </div>
        {calLine && !calibration ? (
          <p className="text-xs text-[var(--warn)]">{t("calibrateNeedsLength")}</p>
        ) : null}
        {calibration ? (
          <p className="text-xs text-brand-strong">{t("calibrateReady")}</p>
        ) : null}
      </div>

      {/* Zone list */}
      <div className="card p-4">
        <h2 className="text-base font-semibold text-foreground">{t("zoneListTitle")}</h2>
        {zones.length === 0 ? (
          <p className="mt-1 text-sm text-muted">{t("zoneListEmpty")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border text-sm">
            {zones.map((z) => {
              const area = zoneAreas.get(z.id);
              return (
                <li key={z.id} className="flex items-center justify-between gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => setSelectedZoneId(z.id)}
                    className={`flex-1 text-left ${
                      z.id === selectedZoneId ? "font-semibold text-brand-strong" : "text-foreground"
                    }`}
                  >
                    {t(`zoneTypes.${z.type}`)}
                  </button>
                  {calibration && typeof area === "number" ? (
                    <span className="tabular-nums text-muted">
                      ~{area.toFixed(1)} {areaUnitLabel}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">{t("areaNeedsCalibration")}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteZone(z.id)}
                    aria-label={t("deleteZone")}
                    className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted transition hover:border-[var(--warn)] hover:text-[var(--warn)]"
                  >
                    {t("delete")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Estimates summary */}
      <div className="card p-4">
        <h2 className="text-base font-semibold text-foreground">{t("estimatesTitle")}</h2>
        {materials ? (
          <>
            <dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Estimate label={t("estBedArea")} value={`~${materials.areaSqft.toFixed(0)} ${t("unitSqFt")}`} />
              <Estimate label={t("estMulch")} value={t("estMulchValue", { count: materials.mulchBags })} />
              <Estimate
                label={t("estEdging")}
                value={materials.edgingFt === null ? t("estEdgingUnknown") : `~${materials.edgingFt.toFixed(0)} ${t("unitFt")}`}
              />
              <Estimate label={t("estPlants")} value={t("estPlantsValue", { count: materials.plantCount })} />
            </dl>
            {unit === "m" ? <p className="mt-2 text-xs text-muted">{t("estMetricNote")}</p> : null}
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">{t("estimatesEmpty")}</p>
        )}
        <p className="mt-3 rounded bg-border/40 p-2 text-xs text-muted">{t("disclaimer")}</p>
        <p className="mt-1 text-[11px] text-muted">{MEASUREMENT_DISCLAIMER}</p>
      </div>
    </div>
  );
}

function Estimate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
