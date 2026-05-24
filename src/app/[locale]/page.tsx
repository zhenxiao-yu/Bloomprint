import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Reveal } from "@/components/ui/reveal";
import { Photo } from "@/components/ui/photo";

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

  // Real yards instead of placeholders — inspiration → buildable plan.
  const showcase = [
    { src: "/photos/garden-path.jpg", title: t("showcase.shotFrontTitle"), desc: t("showcase.shotFrontDesc") },
    { src: "/photos/raised-bed.jpg", title: t("showcase.shotBackTitle"), desc: t("showcase.shotBackDesc") },
    { src: "/photos/seedlings.jpg", title: t("showcase.shotPlantTitle"), desc: t("showcase.shotPlantDesc") },
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
    <main className="snap-y flex w-full flex-1 flex-col gap-16 px-4 pb-24 pt-6 sm:gap-24 sm:px-6">
      {/* ===== Immersive photographic hero ===== */}
      <section className="snap-section mx-auto w-full max-w-6xl">
        <Photo
          src="/photos/wisteria-arch.jpg"
          alt="A garden path under an arch of blooming wisteria"
          priority
          scrim
          sizes="(max-width: 1152px) 100vw, 1152px"
          imgClassName="scale-105"
          className="animate-fade-up flex min-h-[34rem] rounded-[1.75rem] ring-1 ring-foreground/10 sm:min-h-[40rem]"
        >
          <div className="mt-auto grid w-full gap-6 p-5 sm:p-9 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-8">
            <div>
              <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                <Sparkles className="size-3.5" aria-hidden />
                {t("eyebrow")}
              </span>
              <h1 className="mt-4 max-w-xl text-balance text-4xl font-semibold leading-[1.05] text-white drop-shadow-sm sm:text-6xl">
                {t("heroTitle")}
              </h1>
              <p className="mt-4 max-w-lg text-pretty text-base text-white/85 sm:text-lg">
                {t("heroSubtitle")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/plan">
                  <ShimmerButton background="var(--brand)" className="min-h-12 px-6 py-3 text-base">
                    {t("startPlan")} <ArrowRight data-icon="inline-end" />
                  </ShimmerButton>
                </Link>
                <Link
                  href="/plan?demo=1"
                  className="glass-chip inline-flex min-h-12 items-center rounded-full px-6 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {t("tryDemo")}
                </Link>
              </div>
            </div>

            <div className="glass hover-lift rounded-2xl p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
                <ClipboardList className="size-4" aria-hidden />
                {t("snapshot.confidence")}
              </p>
              <div className="grid gap-2.5">
                {snapshot.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-foreground/10 bg-surface/55 p-3 backdrop-blur-sm"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                    <p className="mt-1 text-sm text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Photo>
      </section>

      {/* ===== Entry points ===== */}
      <section className="snap-section mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-3">
        {ctas.map((c, i) => (
          <Link
            key={c.href}
            href={c.href}
            style={{ animationDelay: `${80 + i * 70}ms` }}
            className={`card hover-lift hover-sheen animate-fade-up flex flex-col gap-2 p-6 ${
              c.primary ? "ring-2 ring-brand" : ""
            }`}
          >
            {c.primary ? (
              <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-strong">
                <Sparkles className="size-3" aria-hidden />
                {t("startPlan")}
              </span>
            ) : null}
            <span className="text-lg font-semibold text-foreground">{c.title}</span>
            <span className="text-sm text-muted">{c.desc}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        ))}
      </section>

      {/* ===== Transformation showcase — real yards ===== */}
      <Reveal as="section" className="snap-section mx-auto w-full max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          {t("showcase.eyebrow")}
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold text-foreground sm:text-4xl">
          {t("showcase.title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">{t("showcase.subtitle")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {showcase.map((shot) => (
            <article
              key={shot.src}
              className="hover-lift group overflow-hidden rounded-2xl ring-1 ring-foreground/10"
            >
              <Photo
                src={shot.src}
                alt={shot.title}
                scrim
                sizes="(max-width: 640px) 100vw, 360px"
                className="flex aspect-[4/5]"
                imgClassName="transition-transform duration-700 ease-out group-hover:scale-110"
              >
                <div className="mt-auto p-4">
                  <p className="text-base font-semibold text-white drop-shadow-sm">{shot.title}</p>
                  <p className="mt-1 text-xs text-white/85">{shot.desc}</p>
                </div>
              </Photo>
            </article>
          ))}
        </div>
      </Reveal>

      {/* ===== Plan from a photo — capture band ===== */}
      <Reveal as="section" className="snap-section aurora mx-auto w-full max-w-6xl">
        <div className="card hover-lift grid items-stretch overflow-hidden p-0 lg:grid-cols-2">
          <Photo
            src="/photos/photo-intake.jpg"
            alt="Photographing a yard with a camera"
            sizes="(max-width: 1024px) 100vw, 576px"
            className="min-h-64 lg:min-h-full"
          />
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-strong">
              <Camera className="size-3.5" aria-hidden />
              {t("chips.shoppingList")}
            </span>
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t("capture.title")}</h2>
            <p className="max-w-md text-sm text-muted sm:text-base">{t("capture.body")}</p>
            <Link href="/plan">
              <ShimmerButton background="var(--brand)" className="min-h-11 w-fit px-5 py-2.5">
                {t("capture.cta")} <ArrowRight data-icon="inline-end" />
              </ShimmerButton>
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ===== Feature chips ===== */}
      <Reveal as="section" className="snap-section mx-auto grid w-full max-w-6xl gap-3 sm:grid-cols-4">
        {chips.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="card hover-lift flex items-center gap-3 p-4 text-sm font-medium text-foreground"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            {label}
          </div>
        ))}
      </Reveal>

      {/* ===== Why trust Bloomprint ===== */}
      <Reveal as="section" className="snap-section mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-3">
        {trust.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card hover-lift p-6">
            <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <p className="text-base font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </Reveal>

      {/* ===== Why not just ask a chatbot? ===== */}
      <Reveal as="section" className="snap-section blueprint-grid mx-auto w-full max-w-6xl rounded-3xl p-5 ring-1 ring-foreground/5 sm:p-8">
        <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">{t("compare.title")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("compare.subtitle")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {compare.map((row) => (
            <div key={row.label} className="card hover-lift flex flex-col gap-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">{row.label}</p>
              <div className="flex items-start gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
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
      </Reveal>

      <p className="mx-auto w-full max-w-6xl text-xs text-muted">{t("disclaimer")}</p>
    </main>
  );
}
