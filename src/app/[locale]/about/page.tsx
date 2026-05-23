import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function AboutPage() {
  const t = useTranslations("About");
  const tc = useTranslations("Common");
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="animate-fade-up space-y-6">
        <header>
          <h1 className="text-3xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-2 text-muted">{t("intro")}</p>
        </header>

        <section>
          <h2 className="text-lg font-semibold text-foreground">{t("howTitle")}</h2>
          <ol className="mt-2 space-y-2 text-sm text-foreground">
            <li>{t("how1")}</li>
            <li>{t("how2")}</li>
            <li>{t("how3")}</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">{t("diffTitle")}</h2>
          <ul className="mt-2 space-y-2 text-sm text-foreground">
            <li>
              <strong>{t("diff1Bold")}</strong> {t("diff1")}
            </li>
            <li>
              <strong>{t("diff2Bold")}</strong> {t("diff2")}
            </li>
            <li>
              <strong>{t("diff3Bold")}</strong> {t("diff3")}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">{t("privacyTitle")}</h2>
          <p className="mt-2 text-sm text-foreground">{t("privacyBody")}</p>
        </section>

        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/plan" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong">
            {tc("startPlan")}
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:border-brand"
          >
            {tc("createAccountAlt")}
          </Link>
        </div>
      </div>
    </main>
  );
}
