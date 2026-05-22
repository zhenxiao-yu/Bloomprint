import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { YardMapBuilder } from "@/components/yard-map/YardMapBuilder";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("YardMap");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function YardMapPage() {
  const t = await getTranslations("YardMap");
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/plan" className="text-sm font-semibold text-brand">
        ← {t("backToPlan")}
      </Link>
      <div className="mt-4">
        <YardMapBuilder />
      </div>
    </main>
  );
}
