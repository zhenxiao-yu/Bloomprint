"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Errors");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-12">
      <Alert>
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{t("errorBody")}</AlertDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={reset}>{t("tryAgain")}</Button>
          <Link href="/plan" className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
            {t("freshPlan")}
          </Link>
        </div>
      </Alert>
    </main>
  );
}
