"use client";

import { MotionConfig } from "motion/react";
import { usePreferences } from "@/lib/preferencesStore";

/**
 * Bridges the device "reduce motion" preference into Framer Motion. When on, all
 * motion/react animations collapse to instant (CSS animations are handled by the
 * data-reduce-motion rule in globals.css).
 */
export function MotionPreferences({ children }: { children: React.ReactNode }) {
  const { reduceMotion } = usePreferences();
  return (
    <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
      {children}
    </MotionConfig>
  );
}
