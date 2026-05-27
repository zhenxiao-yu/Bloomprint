"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePreferences } from "@/lib/preferencesStore";

/**
 * Renders Vercel Analytics only when the user has not opted out. Respects the
 * Data & privacy consent toggle in settings — privacy is a first-class control,
 * not buried fine print.
 */
export function AnalyticsGate() {
  const { analytics } = usePreferences();
  if (!analytics) return null;
  return <Analytics />;
}
