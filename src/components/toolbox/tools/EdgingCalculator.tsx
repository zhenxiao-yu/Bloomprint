"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeEdging, type EdgingInput } from "@/domain/toolbox/edging";
import { Input } from "@/components/ui/input";
import {
  DimensionGroup,
  Field,
  NumberField,
  ToolResult,
  num,
  type LenUnit,
  type Shape,
} from "@/components/toolbox/_shared";

/** Edging pieces around a bed perimeter (rectangle/circle only — known-area has no perimeter). */
export function EdgingCalculator() {
  const t = useTranslations("Tools.edging");
  const tc = useTranslations("Toolbox.common");

  const [shape, setShape] = useState<Shape>("rectangle");
  const [unit, setUnit] = useState<LenUnit>("ft");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [radius, setRadius] = useState("");
  const [pieceFt, setPieceFt] = useState("8");
  const [extraPct, setExtraPct] = useState("10");

  const result = useMemo(() => {
    const piece = num(pieceFt);
    if (!piece) return null;
    return computeEdging({
      shape: shape as EdgingInput["shape"],
      unit: unit as EdgingInput["unit"],
      length: num(length),
      width: num(width),
      radius: num(radius),
      pieceFt: piece,
      extraPct: num(extraPct) ?? 0,
    });
  }, [shape, unit, length, width, radius, pieceFt, extraPct]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
        <DimensionGroup
          shape={shape}
          unit={unit}
          length={length}
          width={width}
          radius={radius}
          area=""
          onShape={setShape}
          onUnit={setUnit}
          onLength={setLength}
          onWidth={setWidth}
          onRadius={setRadius}
          onArea={() => {}}
          shapes={["rectangle", "circle"]}
        />
        <div className="grid grid-cols-2 gap-4">
          <NumberField id="piece" label={`${tc("pieceLength")} (${tc("unitFt")})`} value={pieceFt} onChange={setPieceFt} />
          <Field label={tc("extra")}>
            <div className="relative">
              <Input
                inputMode="numeric"
                value={extraPct}
                onChange={(e) => setExtraPct(e.target.value)}
                className="pr-8"
                aria-label={tc("extra")}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                %
              </span>
            </div>
          </Field>
        </div>
      </form>

      <ToolResult
        hasResult={Boolean(result)}
        range={result?.range}
        unitLabel={tc("pieces")}
        note={result ? tc("recommendedPieces", { count: result.piecesWithExtra }) : undefined}
        stats={result ? [{ label: tc("perimeter"), value: `${result.perimeterFt} ${tc("unitFt")}` }] : undefined}
        assumptions={
          result
            ? [tc("assumePiece", { len: result.pieceFt }), tc("assumeBuffer", { pct: result.extraPct }), tc("disclaimer")]
            : undefined
        }
        emptyTitle={t("emptyTitle")}
        emptyBody={t("emptyBody")}
      />
    </div>
  );
}
