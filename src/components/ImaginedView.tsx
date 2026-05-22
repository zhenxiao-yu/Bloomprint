"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type Status = "idle" | "loading" | "done" | "error";

/**
 * Opt-in "imagined view" — only appears when the deployment has image rendering enabled
 * (an IMAGE_API_KEY is configured). The result is clearly labeled as an AI illustration, never a
 * photo of the user's yard, and never affects the plan.
 */
export function ImaginedView({ prompt }: { prompt?: string }) {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/render")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => {
        if (active) setEnabled(Boolean(d.enabled));
      })
      .catch(() => {
        /* leave disabled */
      });
    return () => {
      active = false;
    };
  }, []);

  if (!enabled || !prompt) return null;

  async function generate() {
    setStatus("loading");
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = (await res.json()) as { image?: string };
      if (!res.ok || !data.image) throw new Error("render failed");
      setImage(data.image);
      setStatus("done");
      trackEvent("image_rendered");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      {status !== "done" ? (
        <button
          onClick={generate}
          disabled={status === "loading"}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand disabled:opacity-50"
        >
          {status === "loading" ? "Imagining…" : "✨ Generate an imagined view"}
        </button>
      ) : null}
      {status === "error" ? (
        <p className="mt-2 text-xs text-[var(--warn)]">Couldn&apos;t generate an image — try again.</p>
      ) : null}
      {image ? (
        <figure className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="AI-imagined illustration of the planned yard" className="w-full rounded-xl border border-border" />
          <figcaption className="mt-1 text-xs text-muted">
            AI-imagined illustration — <span className="font-medium">not a photo of your yard</span>.
            Plant choices, counts, and spacing come from your plan, not this image.
          </figcaption>
        </figure>
      ) : null}
    </div>
  );
}
