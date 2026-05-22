/**
 * Analytics — a thin, privacy-friendly wrapper over Vercel Web Analytics (cookieless, no PII).
 *
 * We only record that a loop action happened (generate / refine / save / share / compare), never
 * who did it or any plan contents. If Web Analytics is disabled in the Vercel project, `track` is a
 * harmless no-op, so this never affects the app.
 */
import { track } from "@vercel/analytics";

export type LoopEvent =
  | "plan_generated"
  | "plan_refined"
  | "accuracy_upgraded"
  | "plan_saved"
  | "plan_shared"
  | "plan_compared"
  | "plan_opened_from_history"
  | "plan_visualized"
  | "store_opened"
  | "calendar_added"
  | "image_rendered";

type Primitive = string | number | boolean | null;

export function trackEvent(name: LoopEvent, props?: Record<string, Primitive>): void {
  try {
    track(name, props);
  } catch {
    /* never let telemetry break the UI */
  }
}
