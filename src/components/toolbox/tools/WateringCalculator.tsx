"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { computeWatering } from "@/domain/toolbox/watering";
import { NumberField, ToolExplainer, ToolResult, num } from "@/components/toolbox/_shared";

/** How long to run a sprinkler to apply a target depth of water (catch-cup rate → minutes). */
export function WateringCalculator() {
  const t = useTranslations("Tools.watering");
  const tc = useTranslations("Toolbox.common");

  const [rate, setRate] = useState("");
  const [target, setTarget] = useState("1");

  const result = useMemo(() => {
    const r = num(rate);
    if (!r) return null;
    return computeWatering({ outputInPerHr: r, targetIn: num(target) ?? 1 });
  }, [rate, target]);

  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="flex flex-col gap-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <NumberField id="rate" label={t("outputRate")} value={rate} onChange={setRate} />
            <NumberField id="target" label={t("targetDepth")} value={target} onChange={setTarget} />
          </div>
        </form>

        <ToolResult
          hasResult={Boolean(result)}
          range={result ? { low: result.minutes, high: result.minutes } : undefined}
          unitLabel={t("minutes")}
          assumptions={result ? [tc("disclaimer")] : undefined}
          emptyTitle={t("emptyTitle")}
          emptyBody={t("emptyBody")}
        />
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
