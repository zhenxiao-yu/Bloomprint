"use client";

import { useMemo, useRef, useState } from "react";
import type { PlantPlacement, PlantType } from "@/domain/models";
import { generateLayout } from "@/domain/layout";

const TYPE_COLOR: Record<PlantType, string> = {
  evergreen: "#2f6a3f",
  tree: "#34703f",
  shrub: "#5a9e6f",
  grass: "#c9b46a",
  perennial: "#c97aa8",
  groundcover: "#8aa86a",
};

const TYPE_LABEL: Record<PlantType, string> = {
  evergreen: "Evergreen",
  tree: "Tree",
  shrub: "Shrub",
  grass: "Grass",
  perennial: "Perennial",
  groundcover: "Groundcover",
};

interface Pos {
  x: number;
  y: number;
  scale: number;
}

export function ConceptBoard({ plants }: { plants: PlantPlacement[] }) {
  const initial = useMemo(() => {
    const map = new Map<string, Pos>();
    for (const v of generateLayout(plants)) map.set(v.plantId, { x: v.x, y: v.y, scale: v.scale });
    return map;
  }, [plants]);

  const [overrides, setOverrides] = useState<Map<string, Pos>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  const posOf = (id: string): Pos => overrides.get(id) ?? initial.get(id) ?? { x: 50, y: 50, scale: 1 };

  function onPointerDown(e: React.PointerEvent, id: string) {
    dragId.current = id;
    setActiveId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (dragId.current === null || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(94, Math.max(6, ((e.clientY - rect.top) / rect.height) * 100));
    const id = dragId.current;
    const base = posOf(id);
    setOverrides((prev) => new Map(prev).set(id, { ...base, x, y }));
  }

  function endDrag() {
    dragId.current = null;
    setActiveId(null);
  }

  const typesUsed = useMemo(() => {
    const set = new Set<PlantType>();
    for (const p of plants) set.add(p.type);
    return [...set];
  }, [plants]);

  return (
    <div>
      <div
        ref={boardRef}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        className="relative w-full touch-none overflow-hidden rounded-xl border border-border"
        style={{
          aspectRatio: "5 / 3",
          background:
            "linear-gradient(to bottom, #efe9dc 0%, #efe9dc 80%, #d2e6c6 80%, #cfe3c2 100%)",
        }}
        aria-label="Concept layout of your planting bed, top-down view"
      >
        <span className="absolute left-2 top-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
          House / fence side
        </span>
        <span className="absolute bottom-1.5 left-2 text-[10px] font-medium uppercase tracking-wide text-[color:#4d7a3c]">
          Lawn edge
        </span>

        {plants.map((p) => {
          const pos = posOf(p.plantId);
          const size = Math.round(34 * pos.scale);
          const isActive = activeId === p.plantId;
          return (
            <button
              key={p.plantId}
              onPointerDown={(e) => onPointerDown(e, p.plantId)}
              title={`${p.quantity}× ${p.commonName} — ${TYPE_LABEL[p.type]}`}
              className="absolute flex cursor-grab touch-none select-none items-center justify-center rounded-full text-[9px] font-semibold text-white outline-2 outline-white/70 hover:z-10 hover:brightness-110 active:cursor-grabbing"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: size,
                height: size,
                transform: `translate(-50%, -50%) scale(${isActive ? 1.18 : 1})`,
                background: TYPE_COLOR[p.type],
                boxShadow: isActive
                  ? "0 6px 16px rgba(0,0,0,0.25)"
                  : "0 1px 3px rgba(0,0,0,0.2)",
                zIndex: isActive ? 20 : 1,
                transition: "transform 0.12s ease, box-shadow 0.15s ease, filter 0.15s ease",
                outlineStyle: isActive ? "solid" : "none",
              }}
            >
              {p.quantity}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {typesUsed.map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />
            {TYPE_LABEL[t]}
          </span>
        ))}
        {overrides.size > 0 ? (
          <button
            onClick={() => setOverrides(new Map())}
            className="ml-auto rounded-full border border-border px-3 py-0.5 text-foreground hover:border-brand"
          >
            Reset layout
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">
        Approximate concept layout — numbers are quantities; drag to rearrange. Scale is
        illustrative; use each plant&apos;s spacing note before planting.
      </p>
    </div>
  );
}
