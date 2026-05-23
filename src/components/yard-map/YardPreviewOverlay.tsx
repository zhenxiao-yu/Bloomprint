"use client";

/**
 * Honest Yard Preview overlay — a trustworthy alternative to fake AI renders.
 *
 * Draws the deterministic concept layout (labeled silhouettes + spacing circles)
 * over the user's uploaded photo, clearly labeled as a concept, not exact
 * placement or scale. The konva canvas is dynamically imported with ssr:false
 * (konva needs `window`), so this component is safe to import anywhere.
 */
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { PlantPlacement, PlantType } from "@/domain/models";

// Mirror ConceptBoard's palette for the legend (canvas keeps its own copy).
const TYPE_COLOR: Record<PlantType, string> = {
  evergreen: "#2f6a3f",
  tree: "#34703f",
  shrub: "#5a9e6f",
  grass: "#c9b46a",
  perennial: "#c97aa8",
  groundcover: "#8aa86a",
};

const OverlayCanvas = dynamic(() => import("./YardPreviewOverlayCanvas"), {
  ssr: false,
  loading: () => <div className="w-full rounded-xl border border-border" style={{ aspectRatio: "5 / 3" }} />,
});

export function YardPreviewOverlay({
  photoUrl,
  plants,
}: {
  photoUrl: string;
  plants: PlantPlacement[];
}) {
  const t = useTranslations("Result");
  const tc = useTranslations("ConceptBoard");

  const typesUsed = useMemo(() => {
    const set = new Set<PlantType>();
    for (const p of plants) set.add(p.type);
    return [...set];
  }, [plants]);

  return (
    <div>
      <OverlayCanvas photoUrl={photoUrl} plants={plants} />

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {typesUsed.map((tp) => (
          <span key={tp} className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[tp] }} />
            {tc(`types.${tp}`)}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">{t("overlayCaption")}</p>
    </div>
  );
}
