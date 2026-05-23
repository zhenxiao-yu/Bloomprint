"use client";

/**
 * Yard Map builder — upload or scan a photo, get an AI/template DRAFT of zones,
 * then edit them CAD-style and calibrate to lock real sizes. ROUGH estimates
 * only; every number carries MEASUREMENT_DISCLAIMER and the whole tool works
 * with no photo, no AI model, and no network (DECISIONS.md D1/D2/D11).
 *
 * Honesty: zones proposed by the segmenter are drawn dashed and labeled
 * "draft" at "low" confidence. Real-world dimensions never come from the model
 * — only from the user's calibration. The konva canvas is dynamically imported
 * with ssr:false (konva needs `window`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Undo2,
  Redo2,
  Sparkles,
  LayoutTemplate,
  Grid3x3,
  Spline,
  SquareDashed,
  Trash2,
  MousePointer2,
  SquarePen,
  Wand2,
} from "lucide-react";
import { YardZoneType, createZone, polygonAreaNormalized } from "@/lib/yard-map/zoneModel";
import type { YardZone, Point } from "@/lib/yard-map/zoneModel";
import {
  MEASUREMENT_DISCLAIMER,
  estimateMaterialsFromArea,
  scaleNormalizedArea,
  unitsPerPixel,
} from "@/lib/yard-map/measurement";
import type { Calibration } from "@/lib/yard-map/measurement";
import { normalizedLineLengthPx, polygonToRect, rectToPolygon } from "@/lib/yard-map/rectGeometry";
import { chaikinSmooth, snapRightAngles } from "@/lib/yard-map/polygonGeometry";
import {
  initHistory,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  type History,
} from "@/lib/yard-map/editHistory";
import { detectDraftZones } from "@/lib/vision/yardSegmenter";
import { samSegmenter } from "@/lib/vision/samSegmenter";
import { takeYardPhoto } from "@/lib/yard-map/handoff";
import type { CalibrationLine, CanvasMode } from "./YardZoneCanvas";

const YardZoneCanvas = dynamic(() => import("./YardZoneCanvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full animate-pulse rounded-xl border border-border bg-surface" style={{ aspectRatio: "5 / 3" }} />
  ),
});

const ZONE_TYPES = YardZoneType.options;
type Unit = "ft" | "m";
const GRID_STEP = 0.05;

export function YardMapBuilder({
  photoUrl: initialPhoto = null,
  goal,
}: {
  photoUrl?: string | null;
  goal?: string;
}) {
  const t = useTranslations("YardMap");
  const router = useRouter();

  const [history, setHistory] = useState<History<YardZone[]>>(() => initHistory<YardZone[]>([]));
  const zones = history.present;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<CanvasMode>("select");
  const [activeZoneType, setActiveZoneType] = useState<(typeof ZONE_TYPES)[number]>("planting_bed");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhoto);

  // Pull a photo handed off from the plan flow (stashed in sessionStorage,
  // since a data URL is too large for the query string). Consume-once.
  useEffect(() => {
    if (initialPhoto) return;
    const handed = takeYardPhoto();
    // Defer the state update out of the effect body (repo lint + the same
    // pattern usePhotoImage uses) to avoid a synchronous cascading render.
    if (handed) queueMicrotask(() => setPhotoUrl(handed));
  }, [initialPhoto]);

  const [gridOn, setGridOn] = useState(false);
  const [snapAngles, setSnapAngles] = useState(false);

  const [calLine, setCalLine] = useState<CalibrationLine | null>(null);
  const [knownLength, setKnownLength] = useState<string>("");
  const [unit, setUnit] = useState<Unit>("ft");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const [detecting, setDetecting] = useState(false);
  const [detectNote, setDetectNote] = useState<string | null>(null);
  // SAM "tap to capture": which photo is currently embedded, + a busy state.
  const [samStatus, setSamStatus] = useState<null | "preparing" | "picking">(null);
  const [preparedPhoto, setPreparedPhoto] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Commit a new zone list as one undo step.
  const commit = useCallback((next: YardZone[]) => {
    setHistory((h) => pushHistory(h, next));
  }, []);

  const handleStageSize = useCallback((s: { width: number; height: number }) => setStageSize(s), []);
  const handleCalibrationLine = useCallback((line: CalibrationLine) => {
    setCalLine(line);
    setMode("select");
  }, []);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(reader.result as string);
      setPreparedPhoto(null);
      samSegmenter.reset();
    };
    reader.readAsDataURL(file);
  }

  // Load an HTMLImageElement from a data URL for the segmenter.
  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async function detect(prefer: "ai" | "template") {
    setDetecting(true);
    setDetectNote(null);
    try {
      const image = prefer === "ai" && photoUrl ? await loadImage(photoUrl).catch(() => undefined) : undefined;
      const { zones: drafts, source } = await detectDraftZones({ image, goal }, prefer);
      const next = drafts.map((d) =>
        createZone({ type: d.type, points: d.points, confidence: "low", source: "ai-draft", label: d.label }),
      );
      commit(next);
      setSelectedIds([]);
      setMode("select");
      setDetectNote(
        source === "deeplab-ade20k"
          ? t("detectedAi", { count: next.length })
          : t("detectedTemplate", { count: next.length }),
      );
    } finally {
      setDetecting(false);
    }
  }

  // SAM "tap to capture": embed the photo once, then each tap decodes a region.
  async function startPick() {
    if (!photoUrl) return;
    setMode("pick");
    setDetectNote(null);
    if (preparedPhoto === photoUrl) return; // already embedded this photo
    setSamStatus("preparing");
    try {
      samSegmenter.reset();
      const img = await loadImage(photoUrl);
      const ok = await samSegmenter.prepare(img);
      if (ok) {
        setPreparedPhoto(photoUrl);
      } else {
        setDetectNote(t("samUnavailable"));
        setMode("select");
      }
    } catch {
      setDetectNote(t("samUnavailable"));
      setMode("select");
    } finally {
      setSamStatus((s) => (s === "preparing" ? null : s));
    }
  }

  async function handlePick(point: Point) {
    if (preparedPhoto !== photoUrl || samStatus) return;
    setSamStatus("picking");
    setDetectNote(null);
    try {
      const draft = await samSegmenter.pickAt(point);
      if (draft) {
        const zone = createZone({
          type: draft.type,
          points: draft.points,
          confidence: "low",
          source: "ai-draft",
          label: draft.label,
        });
        commit([...zones, zone]);
        setSelectedIds([zone.id]); // stay in "pick" so they can grab more regions
      } else {
        setDetectNote(t("pickEmpty"));
      }
    } finally {
      setSamStatus(null);
    }
  }

  // --- selection-scoped editing ---
  const selectedZones = zones.filter((z) => selectedIds.includes(z.id));
  const sole = selectedZones.length === 1 ? selectedZones[0] : null;

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    commit(zones.filter((z) => !selectedIds.includes(z.id)));
    setSelectedIds([]);
  }
  function smoothSelected() {
    if (selectedIds.length === 0) return;
    commit(zones.map((z) => (selectedIds.includes(z.id) ? { ...z, points: chaikinSmooth(z.points, 2) } : z)));
  }
  function squareSelected() {
    if (selectedIds.length === 0) return;
    commit(zones.map((z) => (selectedIds.includes(z.id) ? { ...z, points: snapRightAngles(z.points, 18) } : z)));
  }
  function setZoneType(id: string, type: YardZone["type"]) {
    commit(zones.map((z) => (z.id === id ? { ...z, type } : z)));
  }
  function toggleLock(id: string) {
    commit(
      zones.map((z) =>
        z.id === id ? { ...z, confidence: z.confidence === "high" ? "medium" : "high", source: "manual" } : z,
      ),
    );
  }

  // Build a Calibration once we have both a drawn line and a positive length.
  const calibration: Calibration | null = useMemo(() => {
    const len = Number(knownLength);
    if (!calLine || !Number.isFinite(len) || len <= 0) return null;
    const pixelLength = normalizedLineLengthPx(calLine.a, calLine.b, stageSize.width, stageSize.height);
    if (pixelLength <= 0) return null;
    return { pixelLength, realLength: len, unit };
  }, [calLine, knownLength, unit, stageSize.width, stageSize.height]);

  const zoneAreas = useMemo(() => {
    const map = new Map<string, number>();
    if (!calibration) return map;
    for (const z of zones) {
      map.set(z.id, scaleNormalizedArea(polygonAreaNormalized(z.points), stageSize.width, stageSize.height, calibration));
    }
    return map;
  }, [zones, calibration, stageSize.width, stageSize.height]);

  const M2_TO_FT2 = 10.7639;
  const bedArea = useMemo(
    () =>
      !calibration
        ? 0
        : zones.filter((z) => z.type === "planting_bed").reduce((s, z) => s + (zoneAreas.get(z.id) ?? 0), 0),
    [zones, zoneAreas, calibration],
  );
  const bedAreaSqft = unit === "m" ? bedArea * M2_TO_FT2 : bedArea;
  const materials = calibration && bedAreaSqft > 0 ? estimateMaterialsFromArea(bedAreaSqft) : null;
  const areaUnitLabel = unit === "ft" ? t("unitSqFt") : t("unitSqM");

  // Numeric dimension entry for the lone selected zone (only when calibrated).
  function setSoleDimension(axis: "w" | "h", value: number) {
    if (!sole || !calibration || stageSize.width === 0) return;
    const upp = unitsPerPixel(calibration);
    const bbox = polygonToRect(sole.points);
    if (!bbox) return;
    const normW = axis === "w" ? value / (stageSize.width * upp) : bbox.width;
    const normH = axis === "h" ? value / (stageSize.height * upp) : bbox.height;
    const pts = rectToPolygon({ x: bbox.x, y: bbox.y, width: Math.min(normW, 1 - bbox.x), height: Math.min(normH, 1 - bbox.y) });
    commit(zones.map((z) => (z.id === sole.id ? { ...z, points: pts } : z)));
  }
  const soleBbox = sole ? polygonToRect(sole.points) : null;
  const soleW = sole && calibration && soleBbox ? soleBbox.width * stageSize.width * unitsPerPixel(calibration) : null;
  const soleH = sole && calibration && soleBbox ? soleBbox.height * stageSize.height * unitsPerPixel(calibration) : null;

  const hasDrafts = zones.some((z) => z.source === "ai-draft");
  const toolBtn = "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-brand disabled:opacity-40";
  const toolBtnActive = "inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-on-strong transition";

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-strong">{t("beta")}</span>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("instructions")}</p>
      </div>

      {/* Photo + AI/template detection */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()} className={toolBtn}>
            {photoUrl ? t("changePhoto") : t("addPhoto")}
          </button>
          {photoUrl ? (
            <button
              type="button"
              onClick={() => {
                setPhotoUrl(null);
                setPreparedPhoto(null);
                samSegmenter.reset();
              }}
              className="text-xs text-muted hover:text-foreground"
            >
              {t("removePhoto")}
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => detect("ai")}
            disabled={!photoUrl || detecting}
            className={toolBtn}
            title={!photoUrl ? t("aiNeedsPhoto") : undefined}
          >
            <Sparkles className="size-3.5" aria-hidden />
            {detecting ? t("scanning") : t("scanAi")}
          </button>
          <button type="button" onClick={() => detect("template")} disabled={detecting} className={toolBtn}>
            <LayoutTemplate className="size-3.5" aria-hidden />
            {t("startTemplate")}
          </button>
          <button
            type="button"
            onClick={startPick}
            disabled={!photoUrl || detecting || samStatus !== null}
            className={mode === "pick" ? toolBtnActive : toolBtn}
            title={!photoUrl ? t("pickNeedsPhoto") : undefined}
          >
            <Wand2 className="size-3.5" aria-hidden />
            {samStatus === "preparing"
              ? t("preparingModel")
              : samStatus === "picking"
                ? t("capturing")
                : t("tapCapture")}
          </button>
          {detecting || samStatus ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted">
              <span className="size-3 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              {detecting ? t("scanningNote") : samStatus === "preparing" ? t("preparingNote") : t("scanningNote")}
            </span>
          ) : null}
        </div>
        {detectNote ? <p className="text-xs text-brand-strong">{detectNote}</p> : null}
        {hasDrafts ? (
          <p className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-3 py-2 text-xs text-[var(--warn)]">
            {t("draftBanner")}
          </p>
        ) : null}
      </div>

      {/* Edit toolbar */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setMode("select")} aria-pressed={mode === "select"} className={mode === "select" ? toolBtnActive : toolBtn}>
            <MousePointer2 className="size-3.5" aria-hidden />
            {t("modeSelect")}
          </button>
          <button type="button" onClick={() => setMode("draw")} aria-pressed={mode === "draw"} className={mode === "draw" ? toolBtnActive : toolBtn}>
            <SquarePen className="size-3.5" aria-hidden />
            {t("modeDraw")}
          </button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <button type="button" onClick={() => setHistory(undo)} disabled={!canUndo(history)} className={toolBtn}>
            <Undo2 className="size-3.5" aria-hidden />
            {t("undo")}
          </button>
          <button type="button" onClick={() => setHistory(redo)} disabled={!canRedo(history)} className={toolBtn}>
            <Redo2 className="size-3.5" aria-hidden />
            {t("redo")}
          </button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <button type="button" onClick={() => setGridOn((v) => !v)} aria-pressed={gridOn} className={gridOn ? toolBtnActive : toolBtn}>
            <Grid3x3 className="size-3.5" aria-hidden />
            {t("gridSnap")}
          </button>
          <button type="button" onClick={() => setSnapAngles((v) => !v)} aria-pressed={snapAngles} className={snapAngles ? toolBtnActive : toolBtn}>
            <SquareDashed className="size-3.5" aria-hidden />
            {t("rightAngles")}
          </button>
        </div>

        {mode === "draw" ? (
          <div>
            <p className="mb-1.5 text-xs font-medium text-foreground">{t("zoneTypeLabel")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("zoneTypeLabel")}>
              {ZONE_TYPES.map((zt) => (
                <button
                  key={zt}
                  type="button"
                  onClick={() => setActiveZoneType(zt)}
                  aria-pressed={activeZoneType === zt}
                  className={activeZoneType === zt ? toolBtnActive : toolBtn}
                >
                  {t(`zoneTypes.${zt}`)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <p className="text-xs text-muted">
          {mode === "draw"
            ? t("drawHint")
            : mode === "calibrate"
              ? t("calibrateHint")
              : mode === "pick"
                ? t("tapCaptureHint")
                : t("editHint")}
        </p>
      </div>

      <YardZoneCanvas
        zones={zones}
        activeZoneType={activeZoneType}
        mode={mode}
        selectedIds={selectedIds}
        photoUrl={photoUrl}
        calibrationLine={calLine}
        gridStep={gridOn ? GRID_STEP : 0}
        snapAngles={snapAngles}
        onStageSize={handleStageSize}
        onZonesChange={commit}
        onSelectionChange={setSelectedIds}
        onCalibrationLine={handleCalibrationLine}
        onPickPoint={handlePick}
      />

      {/* Selection panel */}
      {selectedIds.length > 0 ? (
        <div className="card space-y-3 p-4">
          {sole ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{t("zoneTypes." + sole.type)}</span>
                {sole.source === "ai-draft" ? (
                  <span className="rounded-full bg-[var(--warn)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--warn)]">{t("draftTag")}</span>
                ) : null}
                {sole.confidence === "high" ? (
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-strong">{t("locked")}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {ZONE_TYPES.map((zt) => (
                  <button key={zt} type="button" onClick={() => setZoneType(sole.id, zt)} aria-pressed={sole.type === zt} className={sole.type === zt ? toolBtnActive : toolBtn}>
                    {t(`zoneTypes.${zt}`)}
                  </button>
                ))}
              </div>
              {calibration && soleW !== null && soleH !== null ? (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col text-xs text-muted">
                    {t("dimWidth")}
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={Math.round(soleW * 10) / 10}
                      onChange={(e) => setSoleDimension("w", Number(e.target.value))}
                      className="mt-1 w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
                    />
                  </label>
                  <label className="flex flex-col text-xs text-muted">
                    {t("dimHeight")}
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={Math.round(soleH * 10) / 10}
                      onChange={(e) => setSoleDimension("h", Number(e.target.value))}
                      className="mt-1 w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
                    />
                  </label>
                  <span className="pb-1.5 text-xs text-muted">{unit === "ft" ? t("unitFt") : t("unitM")}</span>
                  <button type="button" onClick={() => toggleLock(sole.id)} className={sole.confidence === "high" ? toolBtnActive : toolBtn}>
                    {sole.confidence === "high" ? t("locked") : t("lockDims")}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted">{t("dimNeedsCalibration")}</p>
              )}
            </>
          ) : (
            <p className="text-sm text-foreground">{t("selectedCount", { count: selectedIds.length })}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={smoothSelected} className={toolBtn}>
              <Spline className="size-3.5" aria-hidden />
              {t("smooth")}
            </button>
            <button type="button" onClick={squareSelected} className={toolBtn}>
              <SquareDashed className="size-3.5" aria-hidden />
              {t("squareUp")}
            </button>
            <button type="button" onClick={deleteSelected} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warn)] px-3 py-1.5 text-xs font-medium text-[var(--warn)] transition hover:bg-[var(--warn)]/10">
              <Trash2 className="size-3.5" aria-hidden />
              {t("deleteZone")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Calibration controls */}
      <div className="card space-y-3 p-4">
        <h2 className="text-base font-semibold text-foreground">{t("calibrateTitle")}</h2>
        <p className="text-sm text-muted">{t("calibrateInstructions")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={() => setMode(mode === "calibrate" ? "select" : "calibrate")}
            aria-pressed={mode === "calibrate"}
            className={mode === "calibrate" ? toolBtnActive : toolBtn}
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
          <div className="flex overflow-hidden rounded-full border border-border text-xs" role="group" aria-label={t("unitLabel")}>
            {(["ft", "m"] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u} className={`px-3 py-1.5 font-medium transition ${unit === u ? "bg-brand text-on-strong" : "text-foreground hover:bg-brand-soft"}`}>
                {u === "ft" ? t("unitFt") : t("unitM")}
              </button>
            ))}
          </div>
        </div>
        {calLine && !calibration ? <p className="text-xs text-[var(--warn)]">{t("calibrateNeedsLength")}</p> : null}
        {calibration ? <p className="text-xs text-brand-strong">{t("calibrateReady")}</p> : null}
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
                  <button type="button" onClick={() => { setSelectedIds([z.id]); setMode("select"); }} className={`flex flex-1 items-center gap-2 text-left ${z.id === selectedIds[0] ? "font-semibold text-brand-strong" : "text-foreground"}`}>
                    {t(`zoneTypes.${z.type}`)}
                    {z.source === "ai-draft" ? <span className="text-[10px] uppercase text-[var(--warn)]">{t("draftTag")}</span> : null}
                  </button>
                  {calibration && typeof area === "number" ? (
                    <span className="tabular-nums text-muted">~{area.toFixed(1)} {areaUnitLabel}</span>
                  ) : (
                    <span className="text-xs text-muted">{t("areaNeedsCalibration")}</span>
                  )}
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
              <Estimate label={t("estEdging")} value={materials.edgingFt === null ? t("estEdgingUnknown") : `~${materials.edgingFt.toFixed(0)} ${t("unitFt")}`} />
              <Estimate label={t("estPlants")} value={t("estPlantsValue", { count: materials.plantCount })} />
            </dl>
            {unit === "m" ? <p className="mt-2 text-xs text-muted">{t("estMetricNote")}</p> : null}
            <button
              type="button"
              onClick={() => router.push(`/plan?area=${Math.round(materials.areaSqft)}`)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
            >
              {t("useInPlan", { area: Math.round(materials.areaSqft) })}
            </button>
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
