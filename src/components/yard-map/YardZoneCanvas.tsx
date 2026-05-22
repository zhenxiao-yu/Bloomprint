"use client";

/**
 * react-konva canvas for the Yard Map builder.
 *
 * SSR: konva needs `window`, so this file is a client component AND is only ever
 * mounted via a `dynamic(..., { ssr: false })` import from YardMapBuilder. It
 * never renders on the server.
 *
 * Interaction model (kept deliberately simple + reliable):
 *  - "zone" mode: click-drag draws an axis-aligned rectangle, stored as 4
 *    normalized polygon points (compatible with zoneModel).
 *  - "calibrate" mode: two clicks define a reference line; the parent pairs it
 *    with a known real-world length to build a Calibration.
 *
 * All zone/line coordinates live in normalized (0..1) space in the parent; this
 * component converts to/from pixels using the measured stage size.
 */
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Image as KonvaImage, Text, Group } from "react-konva";
import type Konva from "konva";
import type { Point, YardZone, YardZoneType } from "@/lib/yard-map/zoneModel";
import {
  normalizedToPx,
  polygonToRect,
  pxToNormalized,
  rectFromCorners,
  rectToPolygon,
} from "@/lib/yard-map/rectGeometry";

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

export type CanvasMode = "zone" | "calibrate";

export interface CalibrationLine {
  a: Point;
  b: Point;
}

interface YardZoneCanvasProps {
  zones: YardZone[];
  activeZoneType: YardZoneType;
  mode: CanvasMode;
  selectedZoneId: string | null;
  photoUrl?: string | null;
  calibrationLine: CalibrationLine | null;
  /** Reports the live pixel size of the stage (used for measurement math). */
  onStageSize: (size: { width: number; height: number }) => void;
  onAddZone: (points: Point[]) => void;
  onSelectZone: (id: string | null) => void;
  onCalibrationLine: (line: CalibrationLine) => void;
}

const ASPECT = 3 / 5; // height / width — matches the concept board's 5:3.

/** Load an HTMLImageElement for the konva <Image>, or null when no photo. */
function usePhotoImage(photoUrl?: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let active = true;
    if (!photoUrl) {
      // Clear asynchronously so we never call setState synchronously in the effect body.
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
function coverRect(
  imgW: number,
  imgH: number,
  stageW: number,
  stageH: number,
): { x: number; y: number; width: number; height: number } {
  if (imgW <= 0 || imgH <= 0) return { x: 0, y: 0, width: stageW, height: stageH };
  const scale = Math.max(stageW / imgW, stageH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (stageW - width) / 2, y: (stageH - height) / 2, width, height };
}

export default function YardZoneCanvas({
  zones,
  activeZoneType,
  mode,
  selectedZoneId,
  photoUrl,
  calibrationLine,
  onStageSize,
  onAddZone,
  onSelectZone,
  onCalibrationLine,
}: YardZoneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const photoImage = usePhotoImage(photoUrl);

  // Drag-to-draw scratch state, in normalized space.
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragNow, setDragNow] = useState<Point | null>(null);
  // First calibration click awaiting its pair.
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

  function pointerNorm(stage: Konva.Stage | null): Point | null {
    const pos = stage?.getPointerPosition();
    if (!pos) return null;
    return pxToNormalized(pos.x, pos.y, width, height);
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    const norm = pointerNorm(e.target.getStage());
    if (!norm) return;

    if (mode === "calibrate") {
      if (!calStart) {
        setCalStart(norm);
      } else {
        onCalibrationLine({ a: calStart, b: norm });
        setCalStart(null);
      }
      return;
    }

    // zone mode: clicking empty canvas starts a draw; clicking a shape selects it.
    const clickedEmpty = e.target === e.target.getStage();
    if (clickedEmpty) {
      onSelectZone(null);
      setDragStart(norm);
      setDragNow(norm);
    }
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (mode === "zone" && dragStart) {
      const norm = pointerNorm(e.target.getStage());
      if (norm) setDragNow(norm);
    }
  }

  function handleMouseUp() {
    if (mode === "zone" && dragStart && dragNow) {
      const rect = rectFromCorners(dragStart, dragNow);
      // Ignore stray taps that produced a near-zero rectangle.
      if (rect.width > 0.01 && rect.height > 0.01) {
        onAddZone(rectToPolygon(rect));
      }
    }
    setDragStart(null);
    setDragNow(null);
  }

  if (width === 0) {
    // Reserve space before measurement so layout doesn't jump.
    return <div ref={containerRef} className="w-full" style={{ aspectRatio: "5 / 3" }} />;
  }

  const cover = photoImage
    ? coverRect(photoImage.width, photoImage.height, width, height)
    : null;

  const draft =
    dragStart && dragNow ? rectFromCorners(dragStart, dragNow) : null;

  const calA = calStart ? normalizedToPx(calStart, width, height) : null;
  const calLinePx = calibrationLine
    ? {
        a: normalizedToPx(calibrationLine.a, width, height),
        b: normalizedToPx(calibrationLine.b, width, height),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border"
      style={{ touchAction: "none" }}
    >
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        style={{ cursor: mode === "calibrate" ? "crosshair" : "default" }}
      >
        <Layer listening={false}>
          {cover && photoImage ? (
            <KonvaImage
              image={photoImage}
              x={cover.x}
              y={cover.y}
              width={cover.width}
              height={cover.height}
            />
          ) : (
            // Blank board backdrop (house side at top, lawn at bottom).
            <>
              <Rect x={0} y={0} width={width} height={height} fill="#efe9dc" />
              <Rect x={0} y={height * 0.8} width={width} height={height * 0.2} fill="#cfe3c2" />
            </>
          )}
        </Layer>

        <Layer>
          {zones.map((zone) => {
            const r = polygonToRect(zone.points);
            if (!r) return null;
            const px = normalizedToPx({ x: r.x, y: r.y }, width, height);
            const selected = zone.id === selectedZoneId;
            return (
              <Group key={zone.id}>
                <Rect
                  x={px.x}
                  y={px.y}
                  width={r.width * width}
                  height={r.height * height}
                  fill={ZONE_COLORS[zone.type]}
                  opacity={selected ? 0.55 : 0.38}
                  stroke={ZONE_COLORS[zone.type]}
                  strokeWidth={selected ? 3 : 1.5}
                  onMouseDown={(evt) => {
                    if (mode !== "zone") return;
                    evt.cancelBubble = true;
                    onSelectZone(zone.id);
                  }}
                  onTouchStart={(evt) => {
                    if (mode !== "zone") return;
                    evt.cancelBubble = true;
                    onSelectZone(zone.id);
                  }}
                />
              </Group>
            );
          })}

          {/* Live draft rectangle while dragging. */}
          {draft ? (
            <Rect
              x={draft.x * width}
              y={draft.y * height}
              width={draft.width * width}
              height={draft.height * height}
              fill={ZONE_COLORS[activeZoneType]}
              opacity={0.3}
              stroke={ZONE_COLORS[activeZoneType]}
              strokeWidth={1.5}
              dash={[6, 4]}
              listening={false}
            />
          ) : null}

          {/* Committed calibration line. */}
          {calLinePx ? (
            <Line
              points={[calLinePx.a.x, calLinePx.a.y, calLinePx.b.x, calLinePx.b.y]}
              stroke="#1d4ed8"
              strokeWidth={3}
              listening={false}
            />
          ) : null}

          {/* First calibration click marker, awaiting its pair. */}
          {calA ? (
            <>
              <Line points={[calA.x - 8, calA.y, calA.x + 8, calA.y]} stroke="#1d4ed8" strokeWidth={2} listening={false} />
              <Line points={[calA.x, calA.y - 8, calA.x, calA.y + 8]} stroke="#1d4ed8" strokeWidth={2} listening={false} />
            </>
          ) : null}

          {!photoImage ? (
            <Text
              x={8}
              y={6}
              text="↑ house"
              fontSize={11}
              fill="#6b6b6b"
              listening={false}
            />
          ) : null}
        </Layer>
      </Stage>
    </div>
  );
}
