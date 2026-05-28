"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { lookupCompanions, COMPANION_CROPS } from "@/domain/toolbox/companion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, ToolExplainer } from "@/components/toolbox/_shared";

export function CompanionCalculator() {
  const t = useTranslations("Tools.companion");

  const [crop, setCrop] = useState("tomato");
  const result = useMemo(() => lookupCompanions({ crop }), [crop]);
  const evidence = t.has("evidence") ? (t.raw("evidence") as string[]) : [];
  const cropName = (k: string) => (t.has(`crop_${k}`) ? t(`crop_${k}`) : k);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <form onSubmit={(e) => e.preventDefault()}>
          <Field label={t("cropLabel")}>
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger aria-label={t("cropLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPANION_CROPS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {cropName(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </form>

        {result ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
            <div>
              <p className="eyebrow text-trust">{t("goodTitle")}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {result.good.map((c) => (
                  <span key={c} className="rounded-full bg-trust/10 px-2.5 py-1 text-sm font-medium text-trust">
                    {cropName(c)}
                  </span>
                ))}
              </div>
            </div>
            {result.bad.length > 0 ? (
              <div>
                <p className="eyebrow text-warn">{t("badTitle")}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.bad.map((c) => (
                    <span key={c} className="rounded-full bg-warn/10 px-2.5 py-1 text-sm font-medium text-warn">
                      {cropName(c)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="border-t border-border pt-3">
              <p className="eyebrow text-muted-foreground">{t("noteTitle")}</p>
              <p className="mt-1 text-sm text-foreground">{t(`note_${result.note}`)}</p>
            </div>
          </div>
        ) : null}
      </div>

      <ToolExplainer formula={t("formula")} how={t("how")} evidence={evidence} />
    </div>
  );
}
