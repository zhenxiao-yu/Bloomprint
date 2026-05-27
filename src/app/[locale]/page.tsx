import { useTranslations } from "next-intl";
import { ArrowRight, Camera, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Reveal } from "@/components/ui/reveal";
import { Photo } from "@/components/ui/photo";
import { HomeHero } from "./_components/home-hero";
import { StatBand } from "./_components/stat-band";
import { PhotoMarquee } from "./_components/photo-marquee";
import { FeatureBento } from "./_components/feature-bento";
import { CompareGrid } from "./_components/compare-grid";

export default function Home() {
  const t = useTranslations("Home");

  const ctas = [
    { href: "/plan", title: t("ctas.startTitle"), desc: t("ctas.startDesc"), primary: true },
    {
      href: "/plan?mode=staff",
      title: t("ctas.staffTitle"),
      desc: t("ctas.staffDesc"),
      primary: false,
    },
    { href: "/plan?demo=1", title: t("ctas.demoTitle"), desc: t("ctas.demoDesc"), primary: false },
  ];

  // Real yards instead of placeholders — inspiration → buildable plan.
  const showcase = [
    {
      src: "/photos/garden-path.jpg",
      title: t("showcase.shotFrontTitle"),
      desc: t("showcase.shotFrontDesc"),
    },
    {
      src: "/photos/raised-bed.jpg",
      title: t("showcase.shotBackTitle"),
      desc: t("showcase.shotBackDesc"),
    },
    {
      src: "/photos/seedlings.jpg",
      title: t("showcase.shotPlantTitle"),
      desc: t("showcase.shotPlantDesc"),
    },
  ];

  // Direct, honest contrast with a general chatbot — the moat in five rows.
  const compare = [
    { label: t("compare.factsLabel"), them: t("compare.factsThem"), us: t("compare.factsUs") },
    { label: t("compare.sizeLabel"), them: t("compare.sizeThem"), us: t("compare.sizeUs") },
    { label: t("compare.outputLabel"), them: t("compare.outputThem"), us: t("compare.outputUs") },
    { label: t("compare.unsureLabel"), them: t("compare.unsureThem"), us: t("compare.unsureUs") },
    {
      label: t("compare.offlineLabel"),
      them: t("compare.offlineThem"),
      us: t("compare.offlineUs"),
    },
  ];

  return (
    <main className="snap-y flex w-full flex-1 flex-col gap-20 pb-28 pt-8 sm:gap-28">
      {/* ===== Immersive photographic hero ===== */}
      <HomeHero
        eyebrow={t("eyebrow")}
        kicker={t("heroKicker")}
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        startPlan={t("startPlan")}
        tryDemo={t("tryDemo")}
      />

      {/* ===== Honest, copy-derived stat band ===== */}
      <StatBand
        heading={t("stats.heading")}
        deliverablesLabel={t("stats.deliverables")}
        stepsLabel={t("stats.steps")}
        accountsLabel={t("stats.accounts")}
      />

      {/* ===== Transformation showcase — real yards ===== */}
      <Reveal as="section" className="snap-section page-wide">
        <p className="eyebrow text-brand">{t("showcase.eyebrow")}</p>
        <h2 className="title-1 mt-3 max-w-3xl text-foreground">{t("showcase.title")}</h2>
        <p className="lead mt-4 max-w-2xl">{t("showcase.subtitle")}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:gap-8">
          {showcase.map((shot, i) => (
            <Reveal
              as="div"
              key={shot.src}
              delay={i * 90}
              className="hover-lift group overflow-hidden rounded-2xl ring-1 ring-foreground/10"
            >
              <Photo
                src={shot.src}
                alt={shot.title}
                scrim
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 460px"
                className="flex aspect-[4/5]"
                imgClassName="transition-transform duration-700 ease-out group-hover:scale-110"
              >
                <div className="mt-auto p-6">
                  <p className="text-lg font-semibold text-white drop-shadow-sm">{shot.title}</p>
                  <p className="mt-1 text-base text-white/85">{shot.desc}</p>
                </div>
              </Photo>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/* ===== Bento — what every plan includes ===== */}
      <FeatureBento
        eyebrow={t("bento.eyebrow")}
        title={t("bento.title")}
        subtitle={t("bento.subtitle")}
        photoCaption={t("bento.photoCaption")}
        items={{
          shoppingTitle: t("chips.shoppingList"),
          shoppingBody: t("bento.shoppingBody"),
          orderTitle: t("chips.installOrder"),
          orderBody: t("bento.orderBody"),
          risksTitle: t("chips.risksEvidence"),
          risksBody: t("bento.risksBody"),
          storeTitle: t("chips.storeChecklist"),
          storeBody: t("bento.storeBody"),
        }}
      />

      {/* ===== Inspiration marquee ===== */}
      <PhotoMarquee label={t("marquee.label")} />

      {/* ===== Plan from a photo — capture band ===== */}
      <Reveal as="section" className="snap-section aurora page-wide">
        <div className="card hover-lift grid items-stretch overflow-hidden p-0 lg:grid-cols-2">
          <Photo
            src="/photos/photo-intake.jpg"
            alt="Photographing a yard with a camera"
            sizes="(max-width: 1024px) 100vw, 700px"
            className="min-h-72 lg:min-h-full"
          />
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10 lg:p-16">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[13px] font-semibold uppercase tracking-wide text-brand-strong">
              <Camera className="size-3.5" aria-hidden />
              {t("capture.badge")}
            </span>
            <h2 className="title-1 text-foreground">{t("capture.title")}</h2>
            <p className="lead max-w-prose">{t("capture.body")}</p>
            <Link href="/plan">
              <ShimmerButton
                background="var(--brand)"
                shimmerColor="#dde8d2"
                className="min-h-11 w-fit px-5 py-2.5 hover-lift"
              >
                {t("capture.cta")} <ArrowRight data-icon="inline-end" />
              </ShimmerButton>
            </Link>
          </div>
        </div>
      </Reveal>

      {/* ===== Why not just ask a chatbot? ===== */}
      <CompareGrid
        title={t("compare.title")}
        subtitle={t("compare.subtitle")}
        themLabel={t("compare.them")}
        usLabel={t("compare.us")}
        rows={compare}
      />

      {/* ===== Entry points ===== */}
      <Reveal as="section" className="snap-section page-wide">
        <h2 className="title-1 text-center text-foreground">{t("entry.heading")}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:gap-8">
          {ctas.map((c, i) => (
            <Reveal
              as="div"
              key={c.href}
              delay={i * 80}
              className={`card hover-lift hover-sheen group flex flex-col gap-2 p-7 sm:p-8 ${
                c.primary ? "ring-2 ring-brand" : ""
              }`}
            >
              <Link href={c.href} className="flex flex-col gap-2">
                {c.primary ? (
                  <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-[13px] font-semibold uppercase tracking-wide text-brand-strong">
                    <Sparkles className="size-3.5" aria-hidden />
                    {t("entry.recommended")}
                  </span>
                ) : null}
                <span className="title-3 text-foreground">{c.title}</span>
                <span className="text-base leading-relaxed text-muted">{c.desc}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-base font-semibold text-brand">
                  {t("entry.go")}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Reveal>

      <p className="page-wide text-sm leading-relaxed text-muted">{t("disclaimer")}</p>
    </main>
  );
}
