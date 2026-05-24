"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Camera,
  CheckCircle2,
  ClipboardEdit,
  Home,
  ImageOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import type {
  PhotoAnalysisResult,
  PhotoAsset,
  PhotoAssetType,
  PhotoQuality,
  ProjectKind,
} from "@/lib/workspace/types";
import { analyzeYardPhotos } from "@/lib/workspace/photoAnalysis";
import { saveDraftPhoto } from "@/lib/workspace/draftStore";

const MAX_PHOTOS = 8;
const MAX_FILE_MB = 12;

const PHOTO_TYPES: { value: PhotoAssetType; label: string; hint: string }[] = [
  { value: "front_yard", label: "Front yard", hint: "Best wide shot from the street or walkway." },
  { value: "backyard", label: "Backyard", hint: "Show the main usable area and edges." },
  {
    value: "side_yard",
    label: "Side yard",
    hint: "Good for privacy, drainage, and path constraints.",
  },
  {
    value: "problem_area",
    label: "Problem area",
    hint: "Dead shrubs, bare spots, slope, or damage.",
  },
  {
    value: "existing_plants",
    label: "Existing plants",
    hint: "Close enough to see leaves and spacing.",
  },
  {
    value: "soil_drainage",
    label: "Soil/drainage",
    hint: "Mud, pooling water, downspouts, or low spots.",
  },
  {
    value: "measurement",
    label: "Measurements",
    hint: "Tape measure, sketch, or known dimensions.",
  },
  { value: "inspiration", label: "Inspiration", hint: "Optional style reference." },
];

const PROJECT_TYPES: { value: ProjectKind; label: string; desc: string; icon: typeof Home }[] = [
  {
    value: "my_home",
    label: "My home",
    desc: "Plan your own yard and continue later.",
    icon: Home,
  },
  {
    value: "client_property",
    label: "Client property",
    desc: "Organize photos, versions, and quote-ready notes.",
    icon: Users,
  },
  {
    value: "store_customer",
    label: "Store customer",
    desc: "Fast operational help for a shopper in front of you.",
    icon: Store,
  },
];

const STEPS = [
  { key: "project", label: "Project" },
  { key: "photos", label: "Photos" },
  { key: "confirm", label: "Confirm" },
] as const;

type PhotoIssue = {
  id: string;
  fileName: string;
  message: string;
  severity: "warning" | "error";
};

type ImageInspection = {
  dataUrl: string;
  width: number;
  height: number;
  quality: PhotoQuality;
  warnings: string[];
};

function qualityLabel(quality: PhotoQuality | undefined): string {
  if (quality === "unusable") return "Retake";
  if (quality === "needs_review") return "Needs review";
  return "Good";
}

function qualityClass(quality: PhotoQuality | undefined): string {
  if (quality === "unusable") return "border-danger/30 bg-danger/10 text-danger";
  if (quality === "needs_review")
    return "border-[var(--warn)]/30 bg-[var(--warn)]/10 text-[var(--warn)]";
  return "border-brand/20 bg-brand-soft text-brand-strong";
}

function activeStep(photos: PhotoAsset[], analysis: PhotoAnalysisResult | null) {
  if (analysis || photos.length > 0) return "confirm";
  return "photos";
}

async function inspectAndCompress(file: File): Promise<ImageInspection> {
  if (!file.type.startsWith("image/")) {
    throw new Error("This file is not an image. Upload a JPG, PNG, HEIC, or WebP photo.");
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(`This photo is over ${MAX_FILE_MB}MB. Use a smaller image or retake it.`);
  }

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Bloomprint could not read this photo."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("This image could not be opened. Try a different photo."));
    image.src = source;
  });

  const warnings: string[] = [];
  let quality: PhotoQuality = "good";
  const shortestSide = Math.min(img.width, img.height);
  if (shortestSide < 320) {
    quality = "unusable";
    warnings.push(
      "Image is too small for reliable planning. Retake from farther back or upload a larger photo.",
    );
  } else if (shortestSide < 640) {
    quality = "needs_review";
    warnings.push(
      "Image is small. It can help, but measurements and plant details may be unreliable.",
    );
  }

  const sample = document.createElement("canvas");
  sample.width = 40;
  sample.height = 40;
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true });
  if (sampleCtx) {
    sampleCtx.drawImage(img, 0, 0, sample.width, sample.height);
    const data = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
    let brightnessTotal = 0;
    const brightness: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const value = (data[i] + data[i + 1] + data[i + 2]) / 3;
      brightnessTotal += value;
      brightness.push(value);
    }
    const avg = brightnessTotal / brightness.length;
    const variance =
      brightness.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / brightness.length;
    const contrast = Math.sqrt(variance);

    if (avg < 38) {
      quality = quality === "unusable" ? "unusable" : "needs_review";
      warnings.push("Photo looks very dark. Retake in daylight if possible.");
    }
    if (avg > 238) {
      quality = quality === "unusable" ? "unusable" : "needs_review";
      warnings.push("Photo looks overexposed. Retake with less glare if possible.");
    }
    if (contrast < 9) {
      quality = quality === "unusable" ? "unusable" : "needs_review";
      warnings.push("Photo has low detail. A clearer wide shot will improve zone detection.");
    }
  }

  const max = 1280;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process this photo.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    width: img.width,
    height: img.height,
    quality,
    warnings,
  };
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
  const [issues, setIssues] = useState<PhotoIssue[]>([]);
  const [assumptionEdits, setAssumptionEdits] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = activeStep(photos, analysis);
  const usableCount = photos.filter((photo) => photo.quality !== "unusable").length;
  const reviewCount = photos.filter((photo) => photo.quality === "needs_review").length;
  const unusableCount = photos.filter((photo) => photo.quality === "unusable").length;
  const selectedType = PHOTO_TYPES.find((type) => type.value === photoType) ?? PHOTO_TYPES[0];

  const analysisStatus = useMemo(() => {
    if (busy) return status;
    if (analysis)
      return `${Math.round(analysis.confidence * 100)}% photo confidence. Please confirm before planning.`;
    if (photos.length > 0) return "Photos saved. Preparing assumptions...";
    return "Upload photos or continue without them.";
  }, [analysis, busy, photos.length, status]);

  useEffect(() => {
    if (photos.length === 0) {
      onAnalysis(null);
      const reset = window.setTimeout(() => setAssumptionEdits({}), 0);
      return () => window.clearTimeout(reset);
    }
    let active = true;
    let stageTimer: number | null = null;
    const stages = [
      "Reading yard layout...",
      "Checking photo quality...",
      "Estimating planning zones...",
      "Preparing editable assumptions...",
    ];
    let stageIndex = 0;
    const setupTimer = window.setTimeout(() => {
      if (!active) return;
      setBusy(true);
      setStatus(stages[stageIndex]);
      stageTimer = window.setInterval(() => {
        stageIndex = Math.min(stageIndex + 1, stages.length - 1);
        setStatus(stages[stageIndex]);
      }, 450);
    }, 0);
    const timer = window.setTimeout(() => {
      void analyzeYardPhotos(photos).then((next) => {
        if (!active) return;
        onAnalysis(next);
        setAssumptionEdits((current) => {
          const merged = { ...current };
          for (const item of next.assumptions) merged[item.id] = merged[item.id] ?? item.value;
          return merged;
        });
        setStatus("Photo assumptions ready to confirm");
        setBusy(false);
        if (stageTimer) window.clearInterval(stageTimer);
      });
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(setupTimer);
      window.clearTimeout(timer);
      if (stageTimer) window.clearInterval(stageTimer);
    };
  }, [photos, onAnalysis]);

  async function addFiles(files: FileList | File[]) {
    const allIncoming = Array.from(files);
    if (allIncoming.length === 0) return;
    setBusy(true);
    setStatus("Checking and compressing photos locally...");
    const remaining = Math.max(0, MAX_PHOTOS - photos.length);
    const incoming = allIncoming.slice(0, remaining);
    const nextIssues: PhotoIssue[] = [];
    if (allIncoming.length > remaining) {
      nextIssues.push({
        id: crypto.randomUUID(),
        fileName: "Photo limit",
        message: `Bloomprint keeps up to ${MAX_PHOTOS} photos per planning draft. Extra photos were not added.`,
        severity: "warning",
      });
    }

    const existingNames = new Set(photos.map((photo) => photo.fileName).filter(Boolean));
    const next: PhotoAsset[] = [];
    for (const file of incoming) {
      try {
        if (existingNames.has(file.name)) {
          nextIssues.push({
            id: crypto.randomUUID(),
            fileName: file.name,
            message:
              "A photo with this name is already in the draft. It was skipped to avoid duplicates.",
            severity: "warning",
          });
          continue;
        }
        const inspected = await inspectAndCompress(file);
        const asset = await saveDraftPhoto({
          sessionId,
          type: photoType,
          dataUrl: inspected.dataUrl,
          fileName: file.name,
          width: inspected.width,
          height: inspected.height,
          quality: inspected.quality,
          warnings: inspected.warnings,
        });
        next.push(asset);
        if (inspected.warnings.length > 0) {
          nextIssues.push({
            id: crypto.randomUUID(),
            fileName: file.name,
            message: inspected.warnings[0],
            severity: inspected.quality === "unusable" ? "error" : "warning",
          });
        }
      } catch (error) {
        nextIssues.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          message: error instanceof Error ? error.message : "This photo could not be processed.",
          severity: "error",
        });
      }
    }
    setIssues((current) => [...nextIssues, ...current].slice(0, 6));
    if (next.length > 0) onPhotos([...photos, ...next]);
    setStatus(next.length > 0 ? "Photos saved locally" : "No usable photos were added");
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(id: string) {
    onPhotos(photos.filter((p) => p.id !== id));
  }

  function movePhoto(id: string, direction: -1 | 1) {
    const index = photos.findIndex((photo) => photo.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    onPhotos(next);
  }

  function updatePhotoType(id: string, type: PhotoAssetType) {
    onPhotos(
      photos.map((photo) => (photo.id === id ? { ...photo, type, updatedAt: Date.now() } : photo)),
    );
  }

  function confirmAndContinue() {
    if (analysis) {
      onAnalysis({
        ...analysis,
        assumptions: analysis.assumptions.map((item) => ({
          ...item,
          value: assumptionEdits[item.id] ?? item.value,
        })),
      });
    }
    onContinue();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="card overflow-hidden">
        <div className="bg-brand-soft p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                Planning workspace
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
                Upload the yard first. Confirm the assumptions. Then build the plan.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Bloomprint checks photo quality, estimates planning zones, and turns uncertainty
                into editable questions before it generates anything.
              </p>
            </div>
            <div className="rounded-xl border border-brand/20 bg-surface/80 p-3 text-xs text-muted shadow-sm">
              <p className="font-semibold text-foreground">Autosave-first</p>
              <p className="mt-1">Photos and choices are saved locally while you work.</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {STEPS.map((step, index) => {
              const done =
                step.key === "project" ||
                (step.key === "photos" && photos.length > 0) ||
                (step.key === "confirm" && Boolean(analysis));
              const active = currentStep === step.key;
              return (
                <div
                  key={step.key}
                  className={`rounded-xl border px-3 py-2 text-xs transition ${
                    active
                      ? "border-brand bg-surface text-foreground shadow-sm"
                      : done
                        ? "border-brand/20 bg-surface/70 text-brand-strong"
                        : "border-border bg-surface/50 text-muted"
                  }`}
                >
                  <span className="block font-semibold">
                    {index + 1}. {step.label}
                  </span>
                  <span className="mt-0.5 block">{done ? "Ready" : "Next"}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 p-4 sm:grid-cols-3 sm:p-5">
          {PROJECT_TYPES.map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onProjectKind(value)}
              aria-pressed={projectKind === value}
              className={`rounded-xl border p-3 text-left transition hover:border-brand hover:shadow-sm ${
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

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Photo intake</h2>
            <p className="mt-1 text-sm text-muted">
              Add 2-5 photos for best results. Wide shots help layout; close-ups help risk and plant
              notes.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs text-muted">
            <ShieldCheck className="size-4 text-brand" aria-hidden />
            {usableCount} usable · {reviewCount} review · {unusableCount} retake
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <label
              htmlFor="photo-type"
              className="text-xs font-semibold uppercase tracking-wide text-muted"
            >
              Label next photos
            </label>
            <select
              id="photo-type"
              value={photoType}
              onChange={(e) => setPhotoType(e.target.value as PhotoAssetType)}
              className="mt-2 w-full rounded-lg border border-border bg-surface p-2 text-sm text-foreground"
            >
              {PHOTO_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">{selectedType.hint}</p>
            <div className="mt-3 rounded-lg bg-brand-soft p-3 text-xs text-brand-strong">
              Better photos: stand back, include house/walkway edges, avoid night shots, and add one
              close-up of the problem area.
            </div>
          </div>

          <div>
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
              className={`flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition ${
                dragging
                  ? "border-brand bg-brand-soft"
                  : "border-border bg-background/60 hover:border-brand"
              }`}
            >
              {busy ? (
                <Loader2 className="mb-2 size-7 animate-spin text-brand" aria-hidden />
              ) : (
                <Camera className="mb-2 size-7 text-brand" aria-hidden />
              )}
              <span className="text-sm font-semibold text-foreground">
                Tap to take photos, upload, or drag images here
              </span>
              <span className="mt-1 max-w-md text-xs text-muted">
                Bloomprint compresses images locally, flags dark or tiny photos, and keeps going
                even when one upload fails.
              </span>
            </button>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2" aria-live="polite">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  issue.severity === "error"
                    ? "border-danger/30 bg-danger/10 text-danger"
                    : "border-[var(--warn)]/30 bg-[var(--warn)]/10 text-[var(--warn)]"
                }`}
              >
                <span className="font-semibold">{issue.fileName}: </span>
                {issue.message}
              </div>
            ))}
          </div>
        ) : null}

        {photos.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo, index) => (
              <figure
                key={photo.id}
                className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm"
              >
                <div className="relative">
                  {photo.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.previewUrl}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-brand-soft">
                      <ImageOff className="size-8 text-brand" aria-hidden />
                    </div>
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full border px-2 py-1 text-[11px] font-semibold ${qualityClass(photo.quality)}`}
                  >
                    {qualityLabel(photo.quality)}
                  </span>
                </div>
                <figcaption className="flex flex-col gap-2 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-strong">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted">
                      {photo.fileName ?? "Yard photo"}
                    </span>
                  </div>
                  <select
                    value={photo.type}
                    onChange={(e) => updatePhotoType(photo.id, e.target.value as PhotoAssetType)}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground"
                    aria-label="Photo type"
                  >
                    {PHOTO_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {photo.warnings && photo.warnings.length > 0 ? (
                    <p className="rounded-lg bg-background/70 p-2 text-[11px] leading-relaxed text-muted">
                      {photo.warnings[0]}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => movePhoto(photo.id, -1)}
                      disabled={index === 0}
                      className="rounded-full border border-border p-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
                      aria-label="Move photo earlier"
                    >
                      <ArrowUp className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => movePhoto(photo.id, 1)}
                      disabled={index === photos.length - 1}
                      className="rounded-full border border-border p-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
                      aria-label="Move photo later"
                    >
                      <ArrowDown className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-danger transition hover:border-danger/40"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      Remove
                    </button>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            {busy ? (
              <Loader2 className="size-4 animate-spin text-brand" aria-hidden />
            ) : (
              <CheckCircle2 className="size-4 text-brand" aria-hidden />
            )}
            <h2 className="text-lg font-semibold text-foreground">Confirm before planning</h2>
          </div>
          <span className="text-xs text-muted sm:ml-auto">{analysisStatus}</span>
        </div>

        {analysis ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Detected zones
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {analysis.zones.length > 0 ? (
                    analysis.zones.map((zone) => (
                      <li
                        key={zone.id}
                        className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-strong"
                      >
                        Looks like: {zone.label} ({Math.round(zone.confidence * 100)}% confidence)
                      </li>
                    ))
                  ) : (
                    <li className="rounded-lg bg-border/50 px-3 py-2 text-sm text-muted">
                      Not enough usable photo information yet.
                    </li>
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Needs checking
                </p>
                <ul className="mt-2 flex flex-col gap-2 text-sm text-muted">
                  {analysis.missingInfo.map((item) => (
                    <li key={item} className="flex gap-2">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0 text-[var(--warn)]"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Editable assumptions
              </p>
              <div className="mt-3 flex flex-col gap-3">
                {analysis.assumptions.map((item) => (
                  <label key={item.id} className="flex flex-col gap-1 text-sm">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      {item.label}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                          item.confidence === "good"
                            ? "bg-brand-soft text-brand-strong"
                            : item.confidence === "medium"
                              ? "bg-[var(--warn)]/10 text-[var(--warn)]"
                              : "bg-border/60 text-muted"
                        }`}
                      >
                        {item.confidence}
                      </span>
                    </span>
                    <textarea
                      value={assumptionEdits[item.id] ?? item.value}
                      onChange={(e) =>
                        setAssumptionEdits((current) => ({ ...current, [item.id]: e.target.value }))
                      }
                      className="min-h-16 rounded-lg border border-border bg-surface p-2 text-sm text-foreground"
                      disabled={!item.editable}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-border bg-background/60 p-4">
            <Sparkles className="mb-2 size-5 text-brand" aria-hidden />
            <p className="text-sm font-semibold text-foreground">No photo assumptions yet.</p>
            <p className="mt-1 text-sm text-muted">
              Add photos to detect planning zones, or continue without photos and answer the garden
              details manually.
            </p>
          </div>
        )}

        <div className="sticky bottom-3 mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur sm:static sm:flex-row sm:items-center sm:shadow-none">
          <button
            type="button"
            onClick={confirmAndContinue}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
          >
            <ClipboardEdit className="size-4" aria-hidden />
            Confirm and add garden details
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-brand"
          >
            Continue without photos
          </button>
          <span className="text-center text-[11px] text-muted sm:ml-auto sm:text-left">
            Draft saved locally. You can safely leave and come back.
          </span>
        </div>
      </section>
    </div>
  );
}
