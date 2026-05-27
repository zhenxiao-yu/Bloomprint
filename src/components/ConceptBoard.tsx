"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useLocale, useTranslations } from "next-intl";
import type { PlantPlacement, PlantType } from "@/domain/models";
import { generateLayout } from "@/domain/layout";
import { localizePlantName } from "@/lib/plantNames";

const TYPE_COLOR: Record<PlantType, string> = {
  evergreen: "#2f6a3f",
  tree: "#34703f",
  shrub: "#5a9e6f",
  grass: "#c9b46a",
  perennial: "#c97aa8",
  groundcover: "#8aa86a",
};

// Bounds (in % of board) the original raw-pointer version clamped to.
const X_MIN = 3;
const X_MAX = 97;
const Y_MIN = 6;
const Y_MAX = 94;

interface Pos {
  x: number;
  y: number;
  scale: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function Chip({
  plant,
  pos,
  isActive,
  label,
}: {
  plant: PlantPlacement;
  pos: Pos;
  isActive: boolean;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: plant.plantId });
  const size = Math.round(34 * pos.scale);
  // dnd-kit reports the live pixel delta during the drag; apply it on top of
  // the chip's anchored % position so it visually tracks the pointer/keys.
  const dragX = transform?.x ?? 0;
  const dragY = transform?.y ?? 0;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={label}
      title={label}
      className="absolute flex cursor-grab touch-none select-none items-center justify-center rounded-full text-[9px] font-semibold text-white outline-2 outline-white/70 hover:z-10 hover:brightness-110 active:cursor-grabbing"
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: size,
        height: size,
        transform: `translate(calc(-50% + ${dragX}px), calc(-50% + ${dragY}px)) scale(${isActive ? 1.18 : 1})`,
        background: TYPE_COLOR[plant.type],
        boxShadow: isActive ? "0 6px 16px rgba(0,0,0,0.25)" : "0 1px 3px rgba(0,0,0,0.2)",
        zIndex: isActive ? 20 : 1,
        transition: isActive
          ? "box-shadow 0.15s ease, filter 0.15s ease"
          : "transform 0.12s ease, box-shadow 0.15s ease, filter 0.15s ease",
        outlineStyle: isActive ? "solid" : "none",
      }}
    >
      {plant.quantity}
    </button>
  );
}

export function ConceptBoard({ plants }: { plants: PlantPlacement[] }) {
  const t = useTranslations("ConceptBoard");
  const locale = useLocale();
  const initial = useMemo(() => {
    const map = new Map<string, Pos>();
    for (const v of generateLayout(plants)) map.set(v.plantId, { x: v.x, y: v.y, scale: v.scale });
    return map;
  }, [plants]);

  const [overrides, setOverrides] = useState<Map<string, Pos>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const posOf = (id: string): Pos =>
    overrides.get(id) ?? initial.get(id) ?? { x: 50, y: 50, scale: 1 };

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect && rect.width > 0 && rect.height > 0) {
      const base = posOf(id);
      // Convert the pixel delta dnd-kit gives us into % of the measured board.
      const x = clamp(base.x + (event.delta.x / rect.width) * 100, X_MIN, X_MAX);
      const y = clamp(base.y + (event.delta.y / rect.height) * 100, Y_MIN, Y_MAX);
      setOverrides((prev) => new Map(prev).set(id, { ...base, x, y }));
    }
    setActiveId(null);
  }

  const typesUsed = useMemo(() => {
    const set = new Set<PlantType>();
    for (const p of plants) set.add(p.type);
    return [...set];
  }, [plants]);

  return (
    <div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div
          ref={boardRef}
          className="relative w-full touch-none overflow-hidden rounded-xl border border-border"
          style={{
            aspectRatio: "5 / 3",
            background:
              "linear-gradient(to bottom, #efe9dc 0%, #efe9dc 80%, #d2e6c6 80%, #cfe3c2 100%)",
          }}
          aria-label={t("boardAria")}
        >
          <span className="absolute left-2 top-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
            {t("houseSide")}
          </span>
          <span className="absolute bottom-1.5 left-2 text-[10px] font-medium uppercase tracking-wide text-[color:#4d7a3c]">
            {t("lawnEdge")}
          </span>

          {plants.map((p) => (
            <Chip
              key={p.plantId}
              plant={p}
              pos={posOf(p.plantId)}
              isActive={activeId === p.plantId}
              label={t("chipAria", {
                quantity: p.quantity,
                name: localizePlantName(p.plantId, p.commonName, locale),
                type: t(`types.${p.type}`),
              })}
            />
          ))}
        </div>
      </DndContext>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {typesUsed.map((tp) => (
          <span key={tp} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[tp] }} />
            {t(`types.${tp}`)}
          </span>
        ))}
        {overrides.size > 0 ? (
          <button
            onClick={() => setOverrides(new Map())}
            className="ml-auto rounded-full border border-border px-3 py-0.5 text-foreground hover:border-brand"
          >
            {t("resetLayout")}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">{t("caption")}</p>
    </div>
  );
}
