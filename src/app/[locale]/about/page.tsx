import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Metadata } from "next";
import { Photo } from "@/components/ui/photo";

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
    <main className="page-shell flex-1 py-10 sm:py-14">
      <div className="animate-fade-up space-y-8">
        {/* Wide hero — uses the full page width for an inviting opener */}
        <Photo
          src="/photos/soil-hands.jpg"
          alt="Hands holding garden soil"
          priority
          scrim
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="flex min-h-64 rounded-3xl ring-1 ring-foreground/10 sm:min-h-72"
        >
          <header className="mt-auto p-6 sm:p-9">
            <h1 className="title-1 text-white drop-shadow-sm">{t("title")}</h1>
            <p className="lead mt-3 max-w-2xl text-white/90">{t("intro")}</p>
          </header>
        </Photo>

        {/* Reading body — capped to a comfortable line length for older readers */}
        <div className="page-prose space-y-6 px-0">
          <section className="card hover-lift p-6">
            <h2 className="title-3 text-foreground">{t("howTitle")}</h2>
            <ol className="mt-3 space-y-2.5 text-base leading-relaxed text-foreground">
              <li>{t("how1")}</li>
              <li>{t("how2")}</li>
              <li>{t("how3")}</li>
            </ol>
          </section>

          <section className="card hover-lift p-6">
            <h2 className="title-3 text-foreground">{t("diffTitle")}</h2>
            <ul className="mt-3 space-y-2.5 text-base leading-relaxed text-foreground">
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

          <section className="card hover-lift p-6">
            <h2 className="title-3 text-foreground">{t("privacyTitle")}</h2>
            <p className="mt-3 text-base leading-relaxed text-foreground">{t("privacyBody")}</p>
          </section>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/plan" className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 py-2.5 text-base font-semibold text-on-strong">
              {tc("startPlan")}
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-6 py-2.5 text-base font-medium text-foreground hover:border-brand"
            >
              {tc("createAccountAlt")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
