"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, ClipboardList, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/ui/photo";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AuroraText } from "@/components/ui/aurora-text";
import { BorderBeam } from "@/components/ui/border-beam";

/**
 * Home hero — a photographic, layered hero with a staggered blur-fade entrance.
 * Server passes already-translated strings so this stays presentation-only.
 * On-brand aurora colors (forest / blueprint blue / terracotta) feed AuroraText.
 */

type Snapshot = readonly [label: string, value: string];

const AURORA_COLORS = ["#9fceaa", "#4a6f8c", "#d5965d", "#244735"];

export function HomeHero({
  eyebrow,
  kicker,
  title,
  subtitle,
  startPlan,
  tryDemo,
  snapshotLabel,
  snapshot,
}: {
  eyebrow: string;
  /** Short animated aurora phrase that sits above the headline. */
  kicker: string;
  /** The full headline, rendered solid for SEO/translation integrity. */
  title: string;
  subtitle: string;
  startPlan: string;
  tryDemo: string;
  snapshotLabel: string;
  snapshot: readonly Snapshot[];
}) {
  const reduce = useReducedMotion();

  // Staggered blur-fade entrance. Reduced motion → render in place instantly.
  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.12, delayChildren: reduce ? 0 : 0.08 },
    },
  };
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 18, filter: "blur(8px)" },
        show: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
        },
      };

  return (
    <section className="snap-section aurora page-wide">
      <Photo
        src="/photos/wisteria-arch.jpg"
        alt="A garden path under an arch of blooming wisteria"
        priority
        scrim
        sizes="(max-width: 1440px) 100vw, 1400px"
        imgClassName="scale-105 transition-transform duration-[1.2s] ease-out"
        className="group relative flex min-h-136 overflow-hidden rounded-[1.75rem] ring-1 ring-foreground/10 sm:min-h-160 lg:min-h-176"
      >
        {/* Animated beam tracing the hero frame */}
        {!reduce ? (
          <BorderBeam
            size={180}
            duration={9}
            borderWidth={2}
            colorFrom="#9fceaa"
            colorTo="#d5965d"
            className="opacity-70"
          />
        ) : null}

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-auto grid w-full gap-6 p-5 sm:p-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-12 lg:p-12"
        >
          <div>
            <motion.span
              variants={item}
              className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-white"
            >
              <Sparkles className="size-3.5" aria-hidden />
              <span className="eyebrow text-white">{eyebrow}</span>
            </motion.span>

            <motion.div variants={item} className="mt-4">
              <AuroraText
                colors={AURORA_COLORS}
                speed={1.1}
                className="display-lg block leading-none"
              >
                {kicker}
              </AuroraText>
            </motion.div>

            <motion.h1
              variants={item}
              className="display-xl mt-1.5 max-w-3xl text-white drop-shadow-sm"
            >
              {title}
            </motion.h1>

            <motion.p variants={item} className="lead mt-5 max-w-xl text-white/90">
              {subtitle}
            </motion.p>

            <motion.div variants={item} className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/plan" aria-label={startPlan}>
                <ShimmerButton
                  background="var(--brand)"
                  shimmerColor="#dde8d2"
                  className="min-h-12 px-7 py-3 text-base font-semibold hover-lift"
                >
                  {startPlan} <ArrowRight data-icon="inline-end" />
                </ShimmerButton>
              </Link>
              <Link
                href="/plan?demo=1"
                className="glass-chip inline-flex min-h-12 items-center rounded-full px-6 py-2 text-base font-semibold text-white transition hover:bg-white/15"
              >
                {tryDemo}
              </Link>
            </motion.div>
          </div>

          <motion.div variants={item} className="glass hover-lift rounded-2xl p-5">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-brand">
              <ClipboardList className="size-4" aria-hidden />
              {snapshotLabel}
            </p>
            <div className="grid gap-2.5">
              {snapshot.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-foreground/10 bg-surface/55 p-3.5 backdrop-blur-sm"
                >
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <p className="mt-1 text-base text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Photo>
    </section>
  );
}
