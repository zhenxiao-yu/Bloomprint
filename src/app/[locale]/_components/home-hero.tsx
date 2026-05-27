"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AuroraText } from "@/components/ui/aurora-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { Aurora } from "@/components/ui/aurora";

/**
 * Home hero — a React Bits Aurora background with a staggered blur-fade entrance.
 * Server passes already-translated strings so this stays presentation-only.
 * On-brand aurora colors (forest / blueprint blue / terracotta) feed AuroraText.
 */

const AURORA_COLORS = ["#9fceaa", "#4a6f8c", "#d5965d", "#244735"];

export function HomeHero({
  eyebrow,
  kicker,
  title,
  subtitle,
  startPlan,
  tryDemo,
}: {
  eyebrow: string;
  /** Short animated aurora phrase that sits above the headline. */
  kicker: string;
  /** The full headline, rendered solid for SEO/translation integrity. */
  title: string;
  subtitle: string;
  startPlan: string;
  tryDemo: string;
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
    <section className="snap-section page-wide">
      <div className="group relative flex min-h-124 overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-foreground/10 sm:min-h-144 lg:min-h-156">
        {!reduce ? (
          <>
            <Aurora
              className="absolute inset-0 z-0 opacity-95 dark:hidden"
              colorStops={["#dfead4", "#5f9b72", "#d5965d"]}
              amplitude={0.85}
              blend={0.72}
              speed={0.42}
              intensity={0.68}
            />
            <Aurora
              className="absolute inset-0 z-0 hidden opacity-90 dark:block"
              colorStops={["#244735", "#9fceaa", "#8fb5d1"]}
              amplitude={1.08}
              blend={0.64}
              speed={0.46}
              intensity={0.82}
            />
          </>
        ) : (
          <div
            aria-hidden
            className="absolute inset-0 z-0 bg-[radial-gradient(70%_85%_at_16%_18%,color-mix(in_srgb,var(--brand)_34%,transparent),transparent_70%),radial-gradient(58%_68%_at_84%_14%,color-mix(in_srgb,var(--blueprint)_28%,transparent),transparent_72%),linear-gradient(135deg,color-mix(in_srgb,var(--surface)_95%,var(--brand-soft))_0%,var(--surface)_100%)]"
          />
        )}

        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--surface)_96%,transparent)_0%,color-mix(in_srgb,var(--surface)_78%,transparent)_42%,color-mix(in_srgb,var(--surface)_24%,transparent)_72%,transparent_100%)] dark:bg-[linear-gradient(90deg,color-mix(in_srgb,var(--background)_94%,transparent)_0%,color-mix(in_srgb,var(--background)_76%,transparent)_44%,color-mix(in_srgb,var(--background)_26%,transparent)_76%,transparent_100%)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_18%_20%,color-mix(in_srgb,var(--surface)_78%,transparent),transparent_35%),linear-gradient(to_top,color-mix(in_srgb,var(--surface)_82%,transparent),transparent_52%)] dark:bg-[radial-gradient(circle_at_18%_20%,color-mix(in_srgb,var(--background)_78%,transparent),transparent_35%),linear-gradient(to_top,color-mix(in_srgb,var(--background)_84%,transparent),transparent_52%)]"
        />

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
          className="relative z-10 flex w-full flex-col justify-end p-5 sm:p-9 lg:p-12"
        >
          <div className="max-w-3xl">
            <motion.span
              variants={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-surface/70 px-3 py-1 text-foreground shadow-sm backdrop-blur-md dark:bg-background/45"
            >
              <Sparkles className="size-3.5" aria-hidden />
              <span className="eyebrow text-foreground">{eyebrow}</span>
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
              className="display-xl mt-1.5 max-w-3xl text-foreground drop-shadow-[0_1px_18px_color-mix(in_srgb,var(--surface)_88%,transparent)] dark:drop-shadow-[0_1px_22px_color-mix(in_srgb,var(--background)_90%,transparent)]"
            >
              {title}
            </motion.h1>

            <motion.p variants={item} className="lead mt-5 max-w-2xl text-foreground/82">
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
                className="inline-flex min-h-12 items-center rounded-full border border-foreground/12 bg-surface/70 px-6 py-2 text-base font-semibold text-foreground shadow-sm backdrop-blur-md transition hover:bg-surface/90 dark:bg-background/45 dark:hover:bg-background/65"
              >
                {tryDemo}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
