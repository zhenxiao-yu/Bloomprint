"use client";

/**
 * react-konva canvas for the CAD-like Yard Map editor.
 *
 * SSR: konva needs `window`, so this is a client component AND is only ever
 * mounted via a `dynamic(..., { ssr: false })` import. It never renders on the
 * server.
 *
 * Interaction model (unified pointer events, so mouse + touch share one path):
 *  - "draw"      : drag an axis-aligned rectangle → a new zone of activeZoneType.
 *  - "select"    : click a zone to select (shift-click toggles); drag a selected
 *                  zone to move it; drag empty canvas for a marquee select. When
 *                  exactly one zone is selected, vertex + edge handles appear:
 *                  drag a vertex to reshape, click an edge "+" to add a vertex,
 *                  double-click a vertex to delete it (min 3 kept).
 *  - "calibrate" : two clicks define a reference line for real-world scaling.
 *
 * All geometry math lives in the pure, unit-tested lib/yard-map helpers. The
 * canvas keeps only transient gesture state and commits ONE change per gesture
 * (so undo/redo steps map to user actions, not to every animation frame).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Image as KonvaImage, Text, Circle } from "react-konva";
import type Konva from "konva";
import { createZone, type Point, type YardZone, type YardZoneType } from "@/lib/yard-map/zoneModel";
import {
  normalizedToPx,
  pxToNormalized,
  rectFromCorners,
  rectToPolygon,
} from "@/lib/yard-map/rectGeometry";
import {
  insertVertexOnNearestEdge,
  movePolygon,
  moveVertex,
  polygonsInRect,
  removeVertex,
  snapRightAngles,
  snapToGrid,
} from "@/lib/yard-map/polygonGeometry";

/** Fixed, theme-independent palette with good contrast on both light + dark. */
export const ZONE_COLORS: Record<YardZoneType, string> = {
  planting_bed: "#3f8f5a",
  lawn: "#7bb661",
  driveway: "#8a8f99",
  walkway: "#c2a878",
  fence: "#b5774a",
  privacy_target: "#5a7fc4",
  problem_area: "#d97642",
  keep: "#4aa3a3",
  remove: "#c2536b",
};

export type CanvasMode = "select" | "draw" | "calibrate";

export interface CalibrationLine {
  a: Point;
  b: Point;
}

interface YardZoneCanvasProps {
  zones: YardZone[];
  activeZoneType: YardZoneType;
  mode: CanvasMode;
  selectedIds: string[];
  photoUrl?: string | null;
  calibrationLine: CalibrationLine | null;
  /** Grid step in normalized units (0 disables grid + snapping). */
  gridStep?: number;
  /** Orthogonalize a reshaped polygon's near-axis edges on commit. */
  snapAngles?: boolean;
  onStageSize: (size: { width: number; height: number }) => void;
  /** Commit a full new zone list (one call per completed gesture → one undo step). */
  onZonesChange: (zones: YardZone[]) => void;
  onSelectionChange: (ids: string[]) => void;
  onCalibrationLine: (line: CalibrationLine) => void;
}

const ASPECT = 3 / 5; // height / width — matches the concept board's 5:3.
const MOVE_EPS = 0.005; // below this drag distance, a press counts as a click.

type Gesture =
  | { kind: "none" }
  | { kind: "draw"; start: Point; now: Point }
  | { kind: "marquee"; start: Point; now: Point }
  | { kind: "moveZones"; ids: string[]; startPtr: Point; originals: Map<string, Point[]>; now: Point }
  | { kind: "moveVertex"; zoneId: string; index: number; originals: Point[]; now: Point };

/** Load an HTMLImageElement for the konva <Image>, or null when no photo. */
function usePhotoImage(photoUrl?: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let active = true;
    if (!photoUrl) {
      queueMicrotask(() => active && setImg(null));
      return () => {
        active = false;
      };
    }
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = photoUrl;
    const onLoad = () => active && setImg(image);
    image.addEventListener("load", onLoad);
    return () => {
      active = false;
      image.removeEventListener("load", onLoad);
    };
  }, [photoUrl]);
  return img;
}

/** Compute object-fit:cover geometry for the background image. */
function coverRect(imgW: number, imgH: number, stageW: number, stageH: number) {
  if (imgW <= 0 || imgH <= 0) return { x: 0, y: 0, width: stageW, height: stageH };
  const scale = Math.max(stageW / imgW, stageH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (stageW - width) / 2, y: (stageH - height) / 2, width, height };
}

/** Clamp a translation so the moving polygons' union bbox stays within [0,1]. */
function clampDelta(originals: Point[][], dx: number, dy: number): { dx: number; dy: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of originals) {
    for (const p of poly) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX)) return { dx, dy };
  return {
    dx: Math.min(1 - maxX, Math.max(-minX, dx)),
    dy: Math.min(1 - maxY, Math.max(-minY, dy)),
  };
}

export default function YardZoneCanvas({
  zones,
  activeZoneType,
  mode,
  selectedIds,
  photoUrl,
  calibrationLine,
  gridStep = 0,
  snapAngles = false,
  onStageSize,
  onZonesChange,
  onSelectionChange,
  onCalibrationLine,
}: YardZoneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const photoImage = usePhotoImage(photoUrl);
  const [gesture, setGesture] = useState<Gesture>({ kind: "none" });
  const [calStart, setCalStart] = useState<Point | null>(null);

  // Responsive: fit container width, derive height from a fixed aspect ratio.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const height = Math.round(width * ASPECT);
      setSize({ width, height });
      onStageSize({ width, height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onStageSize]);

  const { width, height } = size;

  function ptr(stage: Konva.Stage | null): Point | null {
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return pxToNormalized(pos.x, pos.y, width, height);
  }

  // The single selected zone (handles only render for a lone selection).
  const soleSelected = useMemo(
    () => (selectedIds.length === 1 ? zones.find((z) => z.id === selectedIds[0]) ?? null : null),
    [selectedIds, zones],
  );

  // Apply the live gesture to produce the points the canvas should render.
  function livePoints(zone: YardZone): Point[] {
    if (gesture.kind === "moveZones" && gesture.ids.includes(zone.id)) {
      const orig = gesture.originals.get(zone.id);
      if (orig) {
        const { dx, dy } = clampDelta(
          gesture.ids.map((id) => gesture.originals.get(id)!).filter(Boolean),
          gesture.now.x - gesture.startPtr.x,
          gesture.now.y - gesture.startPtr.y,
        );
        return movePolygon(orig, dx, dy);
      }
    }
    if (gesture.kind === "moveVertex" && gesture.zoneId === zone.id) {
      return moveVertex(gesture.originals, gesture.index, gesture.now);
    }
    return zone.points;
  }

  // ---- Pointer handlers -------------------------------------------------

  function onStageDown(e: Konva.KonvaEventObject<PointerEvent>) {
    if (e.target !== e.target.getStage()) return; // a shape handled it
    const p = ptr(e.target.getStage());
    if (!p) return;
    if (mode === "calibrate") {
      if (!calStart) setCalStart(p);
      else {
        onCalibrationLine({ a: calStart, b: p });
        setCalStart(null);
      }
      return;
    }
    if (mode === "draw") {
      setGesture({ kind: "draw", start: p, now: p });
      return;
    }
    // select mode: empty press starts a marquee.
    setGesture({ kind: "marquee", start: p, now: p });
  }

  function onZoneDown(zone: YardZone, e: Konva.KonvaEventObject<PointerEvent>) {
    if (mode !== "select") return;
    e.cancelBubble = true;
    const p = ptr(e.target.getStage());
    if (!p) return;
    const shift = e.evt.shiftKey;
    if (shift) {
      const next = selectedIds.includes(zone.id)
        ? selectedIds.filter((id) => id !== zone.id)
        : [...selectedIds, zone.id];
      onSelectionChange(next);
      return;
    }
    const ids = selectedIds.includes(zone.id) ? selectedIds : [zone.id];
    if (!selectedIds.includes(zone.id)) onSelectionChange(ids);
    const originals = new Map<string, Point[]>();
    for (const id of ids) {
      const z = zones.find((zz) => zz.id === id);
      if (z) originals.set(id, z.points);
    }
    setGesture({ kind: "moveZones", ids, startPtr: p, originals, now: p });
  }

  function onVertexDown(zone: YardZone, index: number, e: Konva.KonvaEventObject<PointerEvent>) {
    if (mode !== "select") return;
    e.cancelBubble = true;
    const p = ptr(e.target.getStage());
    if (!p) return;
    setGesture({ kind: "moveVertex", zoneId: zone.id, index, originals: zone.points, now: p });
  }

  function onMove(e: Konva.KonvaEventObject<PointerEvent>) {
    if (gesture.kind === "none") return;
    const p = ptr(e.target.getStage());
    if (!p) return;
    setGesture((g) => {
      if (g.kind === "none") return g;
      return { ...g, now: p };
    });
  }

  function onUp() {
    const g = gesture;
    setGesture({ kind: "none" });

    if (g.kind === "draw") {
      const rect = rectFromCorners(g.start, g.now);
      if (rect.width > 0.02 && rect.height > 0.02) {
        const z = createZone({ type: activeZoneType, points: rectToPolygon(rect), source: "manual" });
        onZonesChange([...zones, z]);
        onSelectionChange([z.id]);
      }
      return;
    }
    if (g.kind === "marquee") {
      const moved = Math.hypot(g.now.x - g.start.x, g.now.y - g.start.y);
      if (moved < MOVE_EPS) {
        onSelectionChange([]); // a click on empty canvas clears selection
        return;
      }
      const rect = rectFromCorners(g.start, g.now);
      const idx = polygonsInRect(zones.map((z) => z.points), rect);
      onSelectionChange(idx.map((i) => zones[i].id));
      return;
    }
    if (g.kind === "moveZones") {
      const moved = Math.hypot(g.now.x - g.startPtr.x, g.now.y - g.startPtr.y);
      if (moved < MOVE_EPS) return; // it was a select, not a move
      const { dx, dy } = clampDelta(
        g.ids.map((id) => g.originals.get(id)!).filter(Boolean),
        g.now.x - g.startPtr.x,
        g.now.y - g.startPtr.y,
      );
      onZonesChange(
        zones.map((z) => {
          if (!g.ids.includes(z.id)) return z;
          let pts = movePolygon(g.originals.get(z.id) ?? z.points, dx, dy);
          if (gridStep > 0) pts = pts.map((p) => snapToGrid(p, gridStep));
          return { ...z, points: pts, source: z.source };
        }),
      );
      return;
    }
    if (g.kind === "moveVertex") {
      const moved = Math.hypot(g.now.x - g.originals[g.index]?.x, g.now.y - g.originals[g.index]?.y);
      if (moved < MOVE_EPS) return;
      onZonesChange(
        zones.map((z) => {
          if (z.id !== g.zoneId) return z;
          let pts = moveVertex(z.points, g.index, gridStep > 0 ? snapToGrid(g.now, gridStep) : g.now);
          if (snapAngles) pts = snapRightAngles(pts);
          return { ...z, points: pts };
        }),
      );
    }
  }

  function insertVertex(zone: YardZone, at: Point) {
    onZonesChange(zones.map((z) => (z.id === zone.id ? { ...z, points: insertVertexOnNearestEdge(z.points, at) } : z)));
  }

  function deleteVertex(zone: YardZone, index: number) {
    onZonesChange(zones.map((z) => (z.id === zone.id ? { ...z, points: removeVertex(z.points, index) } : z)));
  }

  if (width === 0) {
    return <div ref={containerRef} className="w-full" style={{ aspectRatio: "5 / 3" }} />;
  }

  const cover = photoImage ? coverRect(photoImage.width, photoImage.height, width, height) : null;
  const draftRect = gesture.kind === "draw" ? rectFromCorners(gesture.start, gesture.now) : null;
  const marqueeRect = gesture.kind === "marquee" ? rectFromCorners(gesture.start, gesture.now) : null;
  const calA = calStart ? normalizedToPx(calStart, width, height) : null;
  const calLinePx = calibrationLine
    ? { a: normalizedToPx(calibrationLine.a, width, height), b: normalizedToPx(calibrationLine.b, width, height) }
    : null;

  // Grid lines (visual aid) when snapping is on.
  const gridLines: number[][] = [];
  if (gridStep > 0) {
    for (let x = gridStep; x < 1; x += gridStep) gridLines.push([x * width, 0, x * width, height]);
    for (let y = gridStep; y < 1; y += gridStep) gridLines.push([0, y * height, width, y * height]);
  }

  const handlePts = soleSelected ? livePoints(soleSelected) : [];

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border"
      style={{ touchAction: "none" }}
    >
      <Stage
        width={width}
        height={height}
        onPointerDown={onStageDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        style={{ cursor: mode === "calibrate" ? "crosshair" : mode === "draw" ? "copy" : "default" }}
      >
        <Layer listening={false}>
          {cover && photoImage ? (
            <KonvaImage image={photoImage} x={cover.x} y={cover.y} width={cover.width} height={cover.height} />
          ) : (
            <>
              <Rect x={0} y={0} width={width} height={height} fill="#efe9dc" />
              <Rect x={0} y={height * 0.8} width={width} height={height * 0.2} fill="#cfe3c2" />
            </>
          )}
          {gridLines.map((pts, i) => (
            <Line key={`g${i}`} points={pts} stroke="#0000001a" strokeWidth={1} />
          ))}
        </Layer>

        <Layer>
          {zones.map((zone) => {
            const pts = livePoints(zone);
            const flat = pts.flatMap((p) => [p.x * width, p.y * height]);
            const selected = selectedIds.includes(zone.id);
            const isDraft = zone.source === "ai-draft";
            return (
              <Line
                key={zone.id}
                points={flat}
                closed
                fill={ZONE_COLORS[zone.type]}
                opacity={selected ? 0.55 : 0.36}
                stroke={ZONE_COLORS[zone.type]}
                strokeWidth={selected ? 3 : 1.5}
                dash={isDraft ? [7, 5] : undefined}
                listening={mode === "select"}
                onPointerDown={(e) => onZoneDown(zone, e as Konva.KonvaEventObject<PointerEvent>)}
              />
            );
          })}

          {/* Edge "+" handles (midpoints) for the lone selection — tap to add a vertex. */}
          {soleSelected && mode === "select"
            ? handlePts.map((p, i) => {
                const n = handlePts[(i + 1) % handlePts.length];
                const mx = ((p.x + n.x) / 2) * width;
                const my = ((p.y + n.y) / 2) * height;
                return (
                  <Circle
                    key={`mid${i}`}
                    x={mx}
                    y={my}
                    radius={5}
                    fill="#ffffff"
                    stroke={ZONE_COLORS[soleSelected.type]}
                    strokeWidth={1.5}
                    opacity={0.85}
                    onPointerDown={(e) => {
                      e.cancelBubble = true;
                      insertVertex(soleSelected, { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 });
                    }}
                  />
                );
              })
            : null}

          {/* Vertex handles for the lone selection — drag to reshape, double-tap to delete. */}
          {soleSelected && mode === "select"
            ? handlePts.map((p, i) => (
                <Circle
                  key={`v${i}`}
                  x={p.x * width}
                  y={p.y * height}
                  radius={7}
                  fill={ZONE_COLORS[soleSelected.type]}
                  stroke="#ffffff"
                  strokeWidth={2}
                  onPointerDown={(e) => onVertexDown(soleSelected, i, e as Konva.KonvaEventObject<PointerEvent>)}
                  onDblClick={() => deleteVertex(soleSelected, i)}
                  onDblTap={() => deleteVertex(soleSelected, i)}
                />
              ))
            : null}

          {draftRect ? (
            <Rect
              x={draftRect.x * width}
              y={draftRect.y * height}
              width={draftRect.width * width}
              height={draftRect.height * height}
              fill={ZONE_COLORS[activeZoneType]}
              opacity={0.3}
              stroke={ZONE_COLORS[activeZoneType]}
              strokeWidth={1.5}
              dash={[6, 4]}
              listening={false}
            />
          ) : null}

          {marqueeRect ? (
            <Rect
              x={marqueeRect.x * width}
              y={marqueeRect.y * height}
              width={marqueeRect.width * width}
              height={marqueeRect.height * height}
              fill="#5a7fc433"
              stroke="#5a7fc4"
              strokeWidth={1}
              dash={[4, 3]}
              listening={false}
            />
          ) : null}

          {calLinePx ? (
            <Line points={[calLinePx.a.x, calLinePx.a.y, calLinePx.b.x, calLinePx.b.y]} stroke="#1d4ed8" strokeWidth={3} listening={false} />
          ) : null}
          {calA ? (
            <>
              <Line points={[calA.x - 8, calA.y, calA.x + 8, calA.y]} stroke="#1d4ed8" strokeWidth={2} listening={false} />
              <Line points={[calA.x, calA.y - 8, calA.x, calA.y + 8]} stroke="#1d4ed8" strokeWidth={2} listening={false} />
            </>
          ) : null}

          {!photoImage ? <Text x={8} y={6} text="↑ house" fontSize={11} fill="#6b6b6b" listening={false} /> : null}
        </Layer>
      </Stage>
    </div>
  );
}
