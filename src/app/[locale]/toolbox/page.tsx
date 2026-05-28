import { useTranslations } from "next-intl";
import { Calculator } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ToolboxIndex } from "@/components/toolbox/ToolboxIndex";

export default function ToolboxPage() {
  const t = useTranslations("Toolbox");

  return (
    <main className="page-shell flex flex-1 flex-col gap-8 py-8 sm:py-14">
      <header className="max-w-3xl">
        <Badge variant="secondary" className="gap-1.5">
          <Calculator className="size-3.5" aria-hidden />
          {t("badge")}
        </Badge>
        <h1 className="display-lg mt-3 text-foreground">{t("title")}</h1>
        <p className="lead mt-3">{t("intro")}</p>
      </header>

      <ToolboxIndex />
    </main>
  );
}
