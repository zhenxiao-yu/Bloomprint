"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export function Reveal(props: {
  children: React.ReactNode
  className?: string
  /** Delay before the reveal transition runs, in milliseconds. */
  delay?: number
  as?: "div" | "section" | "li"
}): React.JSX.Element {
  const { children, className, delay = 0, as = "div" } = props

  const ref = React.useRef<HTMLElement | null>(null)
  // Always start hidden so server and first client paint match (no hydration
  // mismatch). The effect decides whether to reveal immediately or on scroll.
  const [revealed, setRevealed] = React.useState(false)

  React.useEffect(() => {
    const node = ref.current
    if (node == null || revealed) {
      return
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches

    // If motion is unwanted or the API is missing, show content immediately.
    // These reveal decisions depend on browser-only APIs (matchMedia,
    // IntersectionObserver, layout) that aren't available during SSR/render,
    // so they must run after mount; an immediate setState here is intentional.
    if (prefersReducedMotion || typeof IntersectionObserver === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only reveal decision, see note above
      setRevealed(true)
      return
    }

    // Already in view on mount (e.g. above the fold): reveal right away.
    const rect = node.getBoundingClientRect()
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight
    if (rect.top < viewportHeight && rect.bottom > 0) {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            observer.disconnect()
            break
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [revealed])

  const Component = as

  return (
    <Component
      ref={ref as React.Ref<never>}
      data-revealed={revealed ? "true" : "false"}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", className)}
    >
      {children}
    </Component>
  )
}
