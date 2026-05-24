import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Photo — a `next/image` (fill) wrapped in a positioned, overflow-clipped frame.
 * The parent controls the box (aspect ratio / height); the image covers it.
 * `scrim` lays a brand gradient over the photo so overlaid text stays legible;
 * children render above the scrim.
 */
export function Photo({
  src,
  alt,
  className,
  imgClassName,
  sizes = "100vw",
  priority = false,
  scrim = false,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  scrim?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden", scrim && "img-scrim", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn("object-cover", imgClassName)}
      />
      {children ? <div className="relative z-10 flex h-full flex-col">{children}</div> : null}
    </div>
  );
}
