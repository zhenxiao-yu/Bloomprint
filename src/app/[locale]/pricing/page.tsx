import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PricingCards } from "@/components/billing/PricingCards";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pricing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function PricingPage() {
  const t = useTranslations("Pricing");
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <div className="animate-fade-up space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted">
            {t("introBefore")} <strong>{t("introFree")}</strong>
            {t("introAfter")}
          </p>
        </header>

        <PricingCards />

        <p className="text-center text-xs text-muted">
          {t("footBefore")}{" "}
          <Link href="/about" className="text-brand hover:underline">
            {t("footLink")}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
