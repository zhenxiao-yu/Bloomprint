import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { TOOL_SLUGS, getToolMeta } from "@/domain/toolbox/catalog";
import { Link } from "@/i18n/navigation";
import { ToolRunner } from "@/components/toolbox/ToolRunner";

// One static page per locale × tool — deep-linkable + indexable for high-intent calculator queries.
export function generateStaticParams() {
  return routing.locales.flatMap((locale) => TOOL_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale) || !getToolMeta(slug)) return {};
  const t = await getTranslations({ locale, namespace: `Tools.${slug}` });
  return { title: t("title"), description: t("intro") };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  if (!getToolMeta(slug)) notFound();

  const t = await getTranslations("Toolbox");

  return (
    <main className="page-shell flex flex-1 flex-col gap-6 py-8 sm:py-12">
      <Link href="/toolbox" className="text-sm font-semibold text-brand hover:text-brand-strong">
        ← {t("title")}
      </Link>
      <ToolRunner slug={slug} />
    </main>
  );
}
