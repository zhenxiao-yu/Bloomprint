"use client";

import { useEffect, useRef, useState } from "react";
import type { SunExposure } from "@/domain/models";
import { trackEvent } from "@/lib/analytics";

interface Suggestion {
  sun: SunExposure;
  observations: string[];
  note?: string;
}

const SUN_LABEL: Record<string, string> = {
  "full-sun": "Full sun",
  "part-sun": "Part sun",
  shade: "Shade",
  unknown: "Unsure",
};

/** Downscale to <=1024px and return a JPEG data URL (keeps payloads + cost small). */
function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoPanel({
  photoUrl,
  onPhoto,
  onApplySun,
}: {
  photoUrl: string | null;
  onPhoto: (dataUrl: string | null) => void;
  onApplySun: (sun: SunExposure) => void;
}) {
  const [visionEnabled, setVisionEnabled] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/vision")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => active && setVisionEnabled(Boolean(d.enabled)))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await downscale(file);
      onPhoto(dataUrl);
      setSuggestion(null);
      setStatus("idle");
      trackEvent("photo_added");
    } catch {
      setStatus("error");
    }
  }

  async function analyze() {
    if (!photoUrl) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: photoUrl.split(",")[1], mediaType: "image/jpeg" }),
      });
      const data = (await res.json()) as { suggestion?: Suggestion };
      if (!res.ok || !data.suggestion) throw new Error("vision failed");
      setSuggestion(data.suggestion);
      setStatus("done");
      trackEvent("photo_analyzed", { sun: data.suggestion.sun });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-foreground">Your photo</h3>
        <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-brand"
        >
          {photoUrl ? "Change photo" : "Add a photo"}
        </button>
        {photoUrl ? (
          <button
            onClick={() => {
              onPhoto(null);
              setSuggestion(null);
            }}
            className="text-xs text-muted hover:text-foreground"
          >
            Remove
          </button>
        ) : null}
        <span className="ml-auto text-xs text-muted">Stays in your browser — never uploaded or saved.</span>
      </div>

      {photoUrl ? (
        <div className="mt-3 flex flex-wrap items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Your yard" className="h-28 w-auto rounded-lg border border-border" />
          {visionEnabled ? (
            <div className="min-w-[12rem] flex-1">
              {status !== "done" ? (
                <button
                  onClick={analyze}
                  disabled={status === "loading"}
                  className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
                >
                  {status === "loading" ? "Reading photo…" : "Read my photo for sun & layout hints"}
                </button>
              ) : null}
              {status === "error" ? (
                <p className="mt-1 text-xs text-[var(--warn)]">Couldn&apos;t read that photo — try another.</p>
              ) : null}
              {suggestion ? (
                <div className="text-sm">
                  <p className="text-foreground">
                    Looks like <span className="font-semibold">{SUN_LABEL[suggestion.sun]}</span>.
                    {suggestion.sun !== "unknown" ? (
                      <button
                        onClick={() => onApplySun(suggestion.sun)}
                        className="ml-2 rounded-full border border-brand px-3 py-0.5 text-xs font-medium text-brand-strong hover:bg-brand-soft"
                      >
                        Use this
                      </button>
                    ) : null}
                  </p>
                  {suggestion.observations.length > 0 ? (
                    <ul className="mt-1 list-disc pl-5 text-xs text-muted">
                      {suggestion.observations.map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-1 text-xs text-muted">
                    {suggestion.note ?? "An estimate from your photo — confirm on site."}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="flex-1 text-xs text-muted">
              Your photo now shows as the &ldquo;Now&rdquo; in the before/after above.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
