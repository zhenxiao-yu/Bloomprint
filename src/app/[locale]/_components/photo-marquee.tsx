"use client";

import Image from "next/image";
import { Marquee } from "@/components/ui/marquee";

/**
 * Photo marquee — an edge-to-edge scrolling band of real yards/plants, used as
 * a textural "inspiration" strip between sections. Pauses on hover; the whole
 * thing is decorative so a single section label carries the meaning.
 */

const PHOTOS = [
  { src: "/photos/garden-path.jpg", alt: "A planted garden path" },
  { src: "/photos/raised-bed.jpg", alt: "A raised garden bed" },
  { src: "/photos/seedlings.jpg", alt: "Trays of seedlings" },
  { src: "/photos/yard-lawn.jpg", alt: "A green lawn and yard" },
  { src: "/photos/soil-hands.jpg", alt: "Hands holding garden soil" },
  { src: "/photos/house-exterior.jpg", alt: "A home exterior with planting beds" },
  { src: "/photos/soil-tools.jpg", alt: "Garden tools laid out on soil" },
];

export function PhotoMarquee({ label }: { label: string }) {
  return (
    <section
      aria-label={label}
      className="snap-section relative mx-auto w-full max-w-[110rem] overflow-hidden"
    >
      <Marquee pauseOnHover className="[--duration:48s] [--gap:1.25rem]">
        {PHOTOS.map((p) => (
          <div
            key={p.src}
            className="img-duotone relative aspect-[4/3] w-60 shrink-0 overflow-hidden rounded-2xl ring-1 ring-foreground/10 sm:w-80"
          >
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(max-width: 640px) 240px, 320px"
              className="object-cover"
            />
          </div>
        ))}
      </Marquee>
      {/* Edge fades so the strip dissolves into the page instead of hard-cutting */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-background to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-background to-transparent sm:w-28" />
    </section>
  );
}
