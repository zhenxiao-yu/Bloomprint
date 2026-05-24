"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ClipboardEdit, Home, Loader2, Store, Users } from "lucide-react";
import type {
  PhotoAnalysisResult,
  PhotoAsset,
  PhotoAssetType,
  ProjectKind,
} from "@/lib/workspace/types";
import { analyzeYardPhotos } from "@/lib/workspace/photoAnalysis";
import { saveDraftPhoto } from "@/lib/workspace/draftStore";

const PHOTO_TYPES: { value: PhotoAssetType; label: string }[] = [
  { value: "front_yard", label: "Front yard" },
  { value: "backyard", label: "Backyard" },
  { value: "side_yard", label: "Side yard" },
  { value: "problem_area", label: "Problem area" },
  { value: "existing_plants", label: "Existing plants" },
  { value: "soil_drainage", label: "Soil/drainage" },
  { value: "measurement", label: "Measurements" },
  { value: "inspiration", label: "Inspiration" },
];

const PROJECT_TYPES: { value: ProjectKind; label: string; desc: string; icon: typeof Home }[] = [
  { value: "my_home", label: "My home", desc: "Plan your own yard and continue later.", icon: Home },
  { value: "client_property", label: "Client property", desc: "Organize photos, versions, and quote-ready notes.", icon: Users },
  { value: "store_customer", label: "Store customer", desc: "Fast operational help for a shopper in front of you.", icon: Store },
];

async function downscale(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoFirstPlanning({
  sessionId,
  projectKind,
  photos,
  analysis,
  onProjectKind,
  onPhotos,
  onAnalysis,
  onContinue,
  onSkip,
}: {
  sessionId: string;
  projectKind: ProjectKind;
  photos: PhotoAsset[];
  analysis: PhotoAnalysisResult | null;
  onProjectKind: (kind: ProjectKind) => void;
  onPhotos: (photos: PhotoAsset[]) => void;
  onAnalysis: (analysis: PhotoAnalysisResult | null) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  const [photoType, setPhotoType] = useState<PhotoAssetType>("front_yard");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Draft saved locally");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photos.length === 0) {
      onAnalysis(null);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setBusy(true);
      setStatus("Reading yard photos...");
      void analyzeYardPhotos(photos).then((next) => {
        if (!active) return;
        onAnalysis(next);
        setStatus("Photo assumptions ready to confirm");
        setBusy(false);
      });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [photos, onAnalysis]);

  async function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files).slice(0, Math.max(0, 8 - photos.length));
    if (incoming.length === 0) return;
    setBusy(true);
    setStatus("Compressing photos locally...");
    const next: PhotoAsset[] = [];
    for (const file of incoming) {
      try {
        const dataUrl = await downscale(file);
        next.push(await saveDraftPhoto({ sessionId, type: photoType, dataUrl, fileName: file.name }));
      } catch {
        setStatus("One photo could not be processed. Try another image.");
      }
    }
    if (next.length > 0) onPhotos([...photos, ...next]);
    setBusy(false);
  }

  function removePhoto(id: string) {
    onPhotos(photos.filter((p) => p.id !== id));
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Planning workspace</p>
        <h1 className="mt-1 text-2xl font-semibold text-foreground">Start with photos, then confirm the plan details.</h1>
        <p className="mt-2 text-sm text-muted">
          Upload 2-5 photos for a better plan. Bloomprint will look for planting zones, existing
          plants, privacy gaps, and constraints. You can still continue without photos.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {PROJECT_TYPES.map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onProjectKind(value)}
              aria-pressed={projectKind === value}
              className={`rounded-xl border p-3 text-left transition hover:border-brand ${
                projectKind === value ? "border-brand bg-brand-soft" : "border-border bg-surface"
              }`}
            >
              <Icon className="mb-2 size-5 text-brand" aria-hidden />
              <span className="block text-sm font-semibold text-foreground">{label}</span>
              <span className="mt-1 block text-xs text-muted">{desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Upload yard photos</h2>
            <p className="text-sm text-muted">Photos stay in this planning draft unless you save and sync.</p>
          </div>
          <select
            value={photoType}
            onChange={(e) => setPhotoType(e.target.value as PhotoAssetType)}
            className="card ml-auto p-2 text-sm"
          >
            {PHOTO_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void addFiles(e.target.files)}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void addFiles(e.dataTransfer.files);
          }}
          className={`mt-4 flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition ${
            dragging ? "border-brand bg-brand-soft" : "border-border bg-background/60 hover:border-brand"
          }`}
        >
          <Camera className="mb-2 size-7 text-brand" aria-hidden />
          <span className="text-sm font-semibold text-foreground">Tap to add photos or drag them here</span>
          <span className="mt-1 text-xs text-muted">Front, side, problem areas, existing plants, measurements, or inspiration.</span>
        </button>

        {photos.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <figure key={photo.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                {photo.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="aspect-[4/3] bg-brand-soft" />
                )}
                <figcaption className="flex items-center gap-2 p-2 text-xs text-muted">
                  <span className="font-medium text-foreground">{index + 1}</span>
                  <span>{PHOTO_TYPES.find((t) => t.value === photo.type)?.label}</span>
                  <button type="button" onClick={() => removePhoto(photo.id)} className="ml-auto text-[var(--danger)]">
                    Remove
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          {busy ? <Loader2 className="size-4 animate-spin text-brand" aria-hidden /> : <CheckCircle2 className="size-4 text-brand" aria-hidden />}
          <h2 className="text-base font-semibold text-foreground">AI assumptions</h2>
          <span className="ml-auto text-xs text-muted">{status}</span>
        </div>
        {analysis ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Detected zones</p>
              <ul className="mt-2 flex flex-col gap-2">
                {analysis.zones.length > 0 ? (
                  analysis.zones.map((zone) => (
                    <li key={zone.id} className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-strong">
                      Looks like: {zone.label} ({Math.round(zone.confidence * 100)}% confidence)
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg bg-border/50 px-3 py-2 text-sm text-muted">Not enough information yet.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Editable assumptions</p>
              <ul className="mt-2 flex flex-col gap-2">
                {analysis.assumptions.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="font-medium text-foreground">{item.label}:</span>{" "}
                    <span className="text-muted">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Add photos to see detected zones and editable assumptions. You can continue without photos.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong"
          >
            <ClipboardEdit className="size-4" aria-hidden />
            Confirm and add details
          </button>
          <button type="button" onClick={onSkip} className="rounded-full border border-border px-5 py-2 text-sm font-semibold">
            Continue without photos
          </button>
        </div>
      </section>
    </div>
  );
}
