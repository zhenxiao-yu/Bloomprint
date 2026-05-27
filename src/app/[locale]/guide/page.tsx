import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Photo } from "@/components/ui/photo";

export default function GuidePage() {
  const t = useTranslations("Guide");
  const tc = useTranslations("Common");

  const steps = [
    { title: t("step1Title"), body: t("step1Body") },
    { title: t("step2Title"), body: t("step2Body") },
    { title: t("step3Title"), body: t("step3Body") },
    { title: t("step4Title"), body: t("step4Body") },
  ];

  const storeRules = [t("storeRule1"), t("storeRule2"), t("storeRule3"), t("storeRule4")];

  return (
    <main className="page-shell flex flex-1 flex-col gap-10 py-8 sm:py-14">
      <Photo
        src="/photos/garden-path.jpg"
        alt="A flower-lined garden path"
        priority
        scrim
        sizes="(max-width: 1200px) 100vw, 1200px"
        className="flex min-h-64 rounded-3xl ring-1 ring-foreground/10 sm:min-h-72"
      >
        <header className="mt-auto max-w-3xl p-6 sm:p-9">
          <Badge variant="secondary">{t("badge")}</Badge>
          <h1 className="title-1 mt-3 text-white drop-shadow-sm sm:text-5xl">
            {t("title")}
          </h1>
          <p className="lead mt-3 max-w-2xl text-white/90">{t("intro")}</p>
        </header>
      </Photo>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <Card key={step.title} className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm text-on-strong">
                  {index + 1}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-base leading-relaxed text-muted-foreground">{step.body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-brand-soft">
          <CardHeader>
            <CardTitle className="text-lg">{t("storeTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5 text-base leading-relaxed text-foreground">
              {storeRules.map((rule) => (
                <li key={rule} className="rounded-lg bg-surface/75 p-3.5">
                  {rule}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("notPretendTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-base leading-relaxed text-muted-foreground sm:grid-cols-2">
            <p>{t("notPretend1")}</p>
            <p>{t("notPretend2")}</p>
            <p>{t("notPretend3")}</p>
            <p>{t("notPretend4")}</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/plan" className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 py-2.5 text-base font-semibold text-on-strong">
          {tc("startPlan")}
        </Link>
        <Link href="/plan?mode=staff" className="inline-flex min-h-11 items-center rounded-full border border-border px-6 py-2.5 text-base font-semibold">
          {t("openStaff")}
        </Link>
      </div>
    </main>
  );
}
