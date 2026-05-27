import { useTranslations } from "next-intl";
import {
  Calculator,
  Fence,
  Footprints,
  Layers,
  Leaf,
  Mountain,
  Ruler,
  Scissors,
  Sprout,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MulchCalculator } from "@/components/toolbox/MulchCalculator";

// Roadmap tools — each is a deterministic, AI-free calculator (Mulch ships first).
const SOON = [
  { key: "soil", icon: Layers },
  { key: "gravel", icon: Mountain },
  { key: "spacing", icon: Sprout },
  { key: "hedge", icon: Fence },
  { key: "sod", icon: Leaf },
  { key: "paver", icon: Footprints },
  { key: "edging", icon: Scissors },
  { key: "budget", icon: Wallet },
  { key: "labor", icon: Ruler },
] as const;

export default function ToolboxPage() {
  const t = useTranslations("Toolbox");

  return (
    <main className="page-shell flex flex-1 flex-col gap-10 py-8 sm:py-14">
      <header className="max-w-3xl">
        <Badge variant="secondary" className="gap-1.5">
          <Calculator className="size-3.5" aria-hidden />
          {t("badge")}
        </Badge>
        <h1 className="display-lg mt-3 text-foreground">{t("title")}</h1>
        <p className="lead mt-3">{t("intro")}</p>
      </header>

      {/* Mulch Calculator — fully implemented. */}
      <Card>
        <CardHeader>
          <CardTitle className="title-2 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Layers className="size-5" aria-hidden />
            </span>
            {t("mulchTitle")}
          </CardTitle>
          <p className="mt-1 text-base text-muted-foreground">{t("mulchIntro")}</p>
        </CardHeader>
        <CardContent>
          <MulchCalculator />
        </CardContent>
      </Card>

      {/* Roadmap — honest "more coming" rather than fake tools. */}
      <section className="flex flex-col gap-4">
        <h2 className="title-3 text-foreground">{t("moreTitle")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SOON.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-surface-muted/30 p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-muted-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-medium text-foreground">{t(`tool_${key}`)}</p>
                <p className="text-sm text-muted-foreground">{t("soon")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
