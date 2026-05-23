"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import { readApiError } from "@/lib/apiError";

type Status = "idle" | "loading" | "done" | "error";

/**
 * Opt-in "imagined view" — only appears when the deployment has image rendering enabled
 * (an IMAGE_API_KEY is configured). Two flavors, both decorative and clearly labeled, neither
 * ever affecting the plan:
 *  - text-only "imagined illustration" (always available when enabled), and
 *  - a ControlNet "concept restyle" of the user's own photo (only when IMAGE_CONTROLNET is
 *    configured AND a photo exists).
 */
export function ImaginedView({ prompt, photoUrl }: { prompt?: string; photoUrl?: string | null }) {
  const t = useTranslations("Result");
  const [enabled, setEnabled] = useState(false);
  const [controlnet, setControlnet] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [image, setImage] = useState<string | null>(null);
  const [restyled, setRestyled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/render")
      .then((r) => r.json())
      .then((d: { enabled?: boolean; controlnet?: boolean }) => {
        if (!active) return;
        setEnabled(Boolean(d.enabled));
        setControlnet(Boolean(d.controlnet));
      })
      .catch(() => {
        /* leave disabled */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled || !prompt) return null;

  const canRestyle = controlnet && Boolean(photoUrl);

  async function generate(useRestyle: boolean) {
    setStatus("loading");
    setRestyled(useRestyle);
    setError(null);
    try {
      const photoBase64 = useRestyle ? photoUrl?.split(",")[1] : undefined;
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt, photoBase64 }),
      });
      if (!res.ok) throw new Error(await readApiError(res, t("imaginedError")));
      const data = (await res.json()) as { image?: string };
      if (!data.image) throw new Error(t("imaginedError"));
      setImage(data.image);
      setStatus("done");
      trackEvent("image_rendered", { restyle: useRestyle });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("imaginedError"));
      setStatus("error");
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {status !== "done" ? (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => generate(false)}
            disabled={status === "loading"}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand disabled:opacity-50"
          >
            {status === "loading" && !restyled ? t("imaginedBusy") : t("imaginedButton")}
          </button>
          {canRestyle ? (
            <button
              onClick={() => generate(true)}
              disabled={status === "loading"}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand disabled:opacity-50"
            >
              {status === "loading" && restyled ? t("restyleBusy") : t("restyleButton")}
            </button>
          ) : null}
        </div>
      ) : null}
      {status === "error" ? (
        <p className="mt-2 text-xs text-[var(--warn)]">{error ?? t("imaginedError")}</p>
      ) : null}
      {image ? (
        <figure className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={t("imaginedAlt")} className="w-full rounded-xl border border-border" />
          <figcaption className="mt-1 text-xs text-muted">
            {restyled ? t("restyleCaption") : t("imaginedCaption")}
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}
