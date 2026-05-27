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
    <main className="page-shell flex-1 py-10 sm:py-14">
      <div className="aurora animate-fade-up space-y-8 rounded-3xl">
        <header className="text-center">
          <h1 className="title-1 text-foreground">{t("title")}</h1>
          <p className="lead mx-auto mt-3 max-w-2xl text-muted-foreground">
            {t("introBefore")} <strong>{t("introFree")}</strong>
            {t("introAfter")}
          </p>
        </header>

        <PricingCards />

        <p className="text-center text-sm text-muted-foreground">
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
