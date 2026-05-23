import { useTranslations } from "next-intl";
import { ArrowRight, Check, CheckCircle2, ClipboardList, ShieldCheck, ShoppingBag, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export default function Home() {
  const t = useTranslations("Home");

  const ctas = [
    { href: "/plan", title: t("ctas.startTitle"), desc: t("ctas.startDesc"), primary: true },
    { href: "/plan?mode=staff", title: t("ctas.staffTitle"), desc: t("ctas.staffDesc"), primary: false },
    { href: "/plan?demo=1", title: t("ctas.demoTitle"), desc: t("ctas.demoDesc"), primary: false },
  ];

  const snapshot: [string, string][] = [
    [t("snapshot.confidence"), t("snapshot.confidenceValue")],
    [t("snapshot.total"), t("snapshot.totalValue")],
    [t("snapshot.order"), t("snapshot.orderValue")],
    [t("snapshot.store"), t("snapshot.storeValue")],
  ];

  const chips = [
    { icon: ClipboardList, label: t("chips.shoppingList") },
    { icon: CheckCircle2, label: t("chips.installOrder") },
    { icon: ShieldCheck, label: t("chips.risksEvidence") },
    { icon: ShoppingBag, label: t("chips.storeChecklist") },
  ];

  const trust = [
    { icon: ClipboardList, title: t("trust.notAiTitle"), body: t("trust.notAiBody") },
    { icon: ShieldCheck, title: t("trust.factsTitle"), body: t("trust.factsBody") },
    { icon: CheckCircle2, title: t("trust.honestTitle"), body: t("trust.honestBody") },
  ];

  // Direct, honest contrast with a general chatbot — the moat in five rows.
  const compare: { label: string; them: string; us: string }[] = [
    { label: t("compare.factsLabel"), them: t("compare.factsThem"), us: t("compare.factsUs") },
    { label: t("compare.sizeLabel"), them: t("compare.sizeThem"), us: t("compare.sizeUs") },
    { label: t("compare.outputLabel"), them: t("compare.outputThem"), us: t("compare.outputUs") },
    { label: t("compare.unsureLabel"), them: t("compare.unsureThem"), us: t("compare.unsureUs") },
    { label: t("compare.offlineLabel"), them: t("compare.offlineThem"), us: t("compare.offlineUs") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-5 py-10 sm:gap-10 sm:px-6 sm:py-14">
      <header className="animate-fade-up grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-brand">{t("eyebrow")}</p>
          <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="max-w-xl text-base text-muted sm:text-lg">{t("heroSubtitle")}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/plan">
              <ShimmerButton background="var(--brand)" className="min-h-11 px-5 py-2.5">
                {t("startPlan")} <ArrowRight data-icon="inline-end" />
              </ShimmerButton>
            </Link>
            <Link
              href="/plan?demo=1"
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-5 py-2 text-sm font-semibold text-foreground transition hover:border-brand"
            >
              {t("tryDemo")}
            </Link>
          </div>
        </div>
        <Card className="bg-surface/90 shadow-sm">
          <CardContent className="grid gap-3 p-4">
            {snapshot.map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                <p className="mt-1 text-sm text-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {ctas.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            style={{ animationDelay: `${80 + i * 70}ms` }}
            className={`card animate-fade-up flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
              c.primary ? "ring-2 ring-brand" : ""
            }`}
          >
            <span className="text-base font-semibold text-foreground">{c.title}</span>
            <span className="text-sm text-muted">{c.desc}</span>
          </Link>
        ))}
      </div>

      <section className="grid gap-3 sm:grid-cols-4">
        {chips.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-surface p-4 text-sm font-medium text-foreground"
          >
            <Icon className="mb-2 text-brand" aria-hidden="true" />
            {label}
          </div>
        ))}
      </section>

      {/* Why trust Bloomprint — the README says it; the product page should too. */}
      <section className="grid gap-3 sm:grid-cols-3">
        {trust.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-5">
            <Icon className="mb-2 text-brand" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      {/* Why not just ask a chatbot? — the answer, honestly. */}
      <section className="animate-fade-up">
        <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{t("compare.title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("compare.subtitle")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {compare.map((row) => (
            <div key={row.label} className="card flex flex-col gap-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{row.label}</p>
              <div className="flex items-start gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" aria-hidden />
                <p className="text-sm text-muted">
                  <span className="sr-only">{t("compare.them")}: </span>
                  {row.them}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-trust" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  <span className="sr-only">{t("compare.us")}: </span>
                  {row.us}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">{t("disclaimer")}</p>
    </main>
  );
}
