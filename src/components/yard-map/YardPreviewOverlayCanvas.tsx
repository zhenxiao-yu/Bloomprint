"use client";

/**
 * react-konva canvas for the honest Yard Preview overlay.
 *
 * SSR: konva needs `window`, so this file is a client component AND is only ever
 * mounted via a `dynamic(..., { ssr: false })` import from YardPreviewOverlay. It
 * never renders on the server (or in jsdom tests).
 *
 * It draws the EXISTING deterministic concept layout (generateLayout) over the
 * user's photo: a translucent spacing circle, a solid colored dot, the quantity,
 * and a short label per plant. Non-interactive — this is a preview, not the editor.
 * Scale/placement are illustrative only (see the caption + docs/KNOWN_LIMITATIONS.md).
 */
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Circle, Text, Group } from "react-konva";
import type { PlantPlacement, PlantType } from "@/domain/models";
import { generateLayout } from "@/domain/layout";
import { abbreviateLabel, dotRadius, spacingCircleRadius } from "./overlayGeometry";

// Mirror ConceptBoard's plant-type palette so the two views read as one system.
const TYPE_COLOR: Record<PlantType, string> = {
  evergreen: "#2f6a3f",
  tree: "#34703f",
  shrub: "#5a9e6f",
  grass: "#c9b46a",
  perennial: "#c97aa8",
  groundcover: "#8aa86a",
};

const ASPECT = 3 / 5; // height / width — matches the concept board's 5:3.

function usePhotoImage(photoUrl: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let active = true;
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

/** object-fit:cover geometry for the background photo. */
function coverRect(imgW: number, imgH: number, stageW: number, stageH: number) {
  if (imgW <= 0 || imgH <= 0) return { x: 0, y: 0, width: stageW, height: stageH };
  const scale = Math.max(stageW / imgW, stageH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (stageW - width) / 2, y: (stageH - height) / 2, width, height };
}

export default function YardPreviewOverlayCanvas({
  photoUrl,
  plants,
}: {
  photoUrl: string;
  plants: PlantPlacement[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const photoImage = usePhotoImage(photoUrl);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      setSize({ width, height: Math.round(width * ASPECT) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = size;

  if (width === 0) {
    return <div ref={containerRef} className="w-full" style={{ aspectRatio: "5 / 3" }} />;
  }

  const cover = photoImage
    ? coverRect(photoImage.width, photoImage.height, width, height)
    : null;

  const byId = new Map(plants.map((p) => [p.plantId, p]));
  const layout = generateLayout(plants);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-xl border border-border"
    >
      <Stage width={width} height={height} listening={false}>
        <Layer listening={false}>
          {cover && photoImage ? (
            <KonvaImage
              image={photoImage}
              x={cover.x}
              y={cover.y}
              width={cover.width}
              height={cover.height}
            />
          ) : null}
        </Layer>

        <Layer listening={false}>
          {layout.map((v) => {
            const plant = byId.get(v.plantId);
            if (!plant) return null;
            const cx = (v.x / 100) * width;
            const cy = (v.y / 100) * height;
            const color = TYPE_COLOR[plant.type];
            const ring = spacingCircleRadius(v.scale, width);
            const dot = dotRadius(v.scale, width);
            const label = abbreviateLabel(plant.commonName);

            return (
              <Group key={v.plantId} x={cx} y={cy}>
                {/* Spacing circle — translucent footprint. */}
                <Circle radius={ring} fill={color} opacity={0.22} stroke={color} strokeWidth={1.5} />
                {/* Solid silhouette dot. */}
                <Circle radius={dot} fill={color} stroke="#ffffff" strokeWidth={1.5} />
                {/* Quantity centered on the dot. */}
                <Text
                  text={`${plant.quantity}`}
                  fontSize={Math.max(9, dot * 1.1)}
                  fontStyle="bold"
                  fill="#ffffff"
                  width={dot * 4}
                  align="center"
                  offsetX={dot * 2}
                  offsetY={Math.max(9, dot * 1.1) / 2}
                />
                {/* Common-name label below the dot, with a readable backing. */}
                <Text
                  text={label}
                  fontSize={11}
                  fontStyle="bold"
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={2.4}
                  fillAfterStrokeEnabled
                  width={ring * 2.4}
                  align="center"
                  offsetX={ring * 1.2}
                  y={dot + 4}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
