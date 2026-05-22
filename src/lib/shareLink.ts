/**
 * Share links — encode a plan's *inputs* (not the rendered plan) into a URL.
 *
 * Because the engine is deterministic (docs/DECISIONS.md D1), `{ intake, adjustments }` is enough
 * to regenerate the exact plan anywhere. So sharing needs no backend and stores no data: the link
 * carries the inputs, the recipient's browser rebuilds the plan via POST /api/plan.
 */
import { RefinementAdjustment, YardIntake } from "@/domain/models";
import { z } from "zod";

export const SharePayload = z.object({
  intake: YardIntake,
  adjustments: z.array(RefinementAdjustment).default([]),
});
export type SharePayload = z.infer<typeof SharePayload>;

export const SHARE_PARAM = "p";

function toBase64Url(s: string): string {
  const b64 = btoa(encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(b64);
  return decodeURIComponent(
    decoded
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
}

export function encodeShare(payload: SharePayload): string {
  return toBase64Url(JSON.stringify({ intake: payload.intake, adjustments: payload.adjustments }));
}

/** Decode + validate. Any failure (bad base64, bad JSON, schema mismatch) returns null. */
export function decodeShare(param: string | null | undefined): SharePayload | null {
  if (!param) return null;
  try {
    const parsed = SharePayload.safeParse(JSON.parse(fromBase64Url(param)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Build an absolute share URL for the current origin. */
export function buildShareUrl(origin: string, payload: SharePayload): string {
  return `${origin}/plan?${SHARE_PARAM}=${encodeShare(payload)}`;
}
