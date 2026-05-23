"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("Errors");
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-display text-6xl font-semibold text-brand">404</p>
      <h1 className="mt-4 text-xl font-semibold text-foreground">{t("notFoundTitle")}</h1>
      <p className="mt-2 max-w-md text-sm text-muted">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
      >
        {t("goHome")}
      </Link>
    </main>
  );
}
