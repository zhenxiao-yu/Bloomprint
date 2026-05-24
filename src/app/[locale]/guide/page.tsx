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
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <Photo
        src="/photos/garden-path.jpg"
        alt="A flower-lined garden path"
        priority
        scrim
        sizes="(max-width: 1024px) 100vw, 1024px"
        className="flex min-h-60 rounded-3xl ring-1 ring-foreground/10"
      >
        <header className="mt-auto max-w-3xl p-5 sm:p-8">
          <Badge variant="secondary">{t("badge")}</Badge>
          <h1 className="mt-3 text-3xl font-semibold text-white drop-shadow-sm sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/85">{t("intro")}</p>
        </header>
      </Photo>

      <section className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => (
          <Card key={step.title} className="hover-lift">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-brand text-xs text-on-strong">
                  {index + 1}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted">{step.body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="bg-brand-soft">
          <CardHeader>
            <CardTitle>{t("storeTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-foreground">
              {storeRules.map((rule) => (
                <li key={rule} className="rounded-lg bg-surface/75 p-3">
                  {rule}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("notPretendTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted sm:grid-cols-2">
            <p>{t("notPretend1")}</p>
            <p>{t("notPretend2")}</p>
            <p>{t("notPretend3")}</p>
            <p>{t("notPretend4")}</p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/plan" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong">
          {tc("startPlan")}
        </Link>
        <Link href="/plan?mode=staff" className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
          {t("openStaff")}
        </Link>
      </div>
    </main>
  );
}
