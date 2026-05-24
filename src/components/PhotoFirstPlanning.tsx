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
  Leaf,
  Loader2,
  Maximize2,
  Ruler,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Users,
  X,
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
import {
  areNearDuplicates,
  computeImageSignals,
  gradeImageQuality,
  NEUTRAL_SIGNALS,
  perceptualHash,
  type ImageSignals,
} from "@/lib/workspace/imageSignals";

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

const CAMERA_TIPS = [
  "Hold steady and include the bed edges.",
  "Keep the house, walkway, or fence line level.",
  "Use the center box for the main problem area.",
  "Step back if plants or bed corners are cropped.",
];

const EXAMPLE_SHOTS: {
  type: PhotoAssetType;
  title: string;
  desc: string;
  overlay: "wide" | "plant" | "measure";
}[] = [
  {
    type: "front_yard",
    title: "Wide context",
    desc: "House edge, walkway, and full planting bed visible.",
    overlay: "wide",
  },
  {
    type: "existing_plants",
    title: "Plant close-up",
    desc: "Leaves and branching clear enough for a cautious ID note.",
    overlay: "plant",
  },
  {
    type: "measurement",
    title: "Measurement proof",
    desc: "Tape, sketch, or known width visible before buying.",
    overlay: "measure",
  },
];

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
  signals: ImageSignals;
  signature: string;
};

type FrameSignal = {
  brightness: number | null;
  contrast: number | null;
  tooDark: boolean;
  tooBright: boolean;
  lowDetail: boolean;
};

type VisionSuggestion = {
  sun?: string;
  observations?: string[];
  note?: string;
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

function sunLabel(value: string): string {
  if (value === "full-sun") return "lots of sun";
  if (value === "part-sun") return "some sun";
  if (value === "shade") return "mostly shade";
  return "unknown sun";
}

function dataUrlParts(
  dataUrl: string,
): { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string } | null {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  return { mediaType: match[1] as "image/jpeg" | "image/png" | "image/webp", base64: match[2] };
}

async function readVisionSuggestion(photos: PhotoAsset[]): Promise<VisionSuggestion | null> {
  const photo = photos.find((item) => item.quality !== "unusable" && item.previewUrl);
  const parts = photo?.previewUrl ? dataUrlParts(photo.previewUrl) : null;
  if (!parts) return null;
  // Optional enrichment — cap it so a slow/hung /api/vision never stalls the flow.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const enabled = (await fetch("/api/vision", { signal: controller.signal }).then((res) =>
      res.json(),
    )) as { enabled?: boolean };
    if (!enabled.enabled) return null;
    const res = await fetch("/api/vision", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageBase64: parts.base64, mediaType: parts.mediaType }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { suggestion?: VisionSuggestion };
    return data.suggestion ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mergeVisionSuggestion(
  analysis: PhotoAnalysisResult,
  suggestion: VisionSuggestion | null,
): PhotoAnalysisResult {
  if (!suggestion) return analysis;
  const observations = (suggestion.observations ?? []).slice(0, 4);
  return {
    ...analysis,
    detectedObjects: [
      ...analysis.detectedObjects,
      ...observations.map((item) => `photo ML observation: ${item}`),
    ],
    assumptions: analysis.assumptions.map((item) =>
      item.id === "sun" && suggestion.sun && suggestion.sun !== "unknown"
        ? {
            ...item,
            value: `Photo ML estimates ${sunLabel(suggestion.sun)}. Please confirm before buying plants.`,
            confidence: "medium",
          }
        : item,
    ),
    risks: [...analysis.risks, ...(suggestion.note ? [`Photo ML note: ${suggestion.note}`] : [])],
    confidence: Math.min(0.82, analysis.confidence + (observations.length > 0 ? 0.04 : 0)),
  };
}

function sampleCanvas(canvas: HTMLCanvasElement): FrameSignal {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      brightness: null,
      contrast: null,
      tooDark: false,
      tooBright: false,
      lowDetail: false,
    };
  }
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
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
  return {
    brightness: avg,
    contrast,
    tooDark: avg < 38,
    tooBright: avg > 238,
    lowDetail: contrast < 9,
  };
}

async function inspectDataUrl(source: string): Promise<ImageInspection> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("This image could not be opened. Try a different photo."));
    image.src = source;
  });

  const shortestSide = Math.min(img.width, img.height);

  // Analysis sample (~160px longest side) — large enough that blur, colour, and
  // duplicate signals survive, unlike the 40x40 used for cheap live brightness.
  let signals: ImageSignals = { ...NEUTRAL_SIGNALS };
  let signature = "";
  const aSample = document.createElement("canvas");
  const aScale = Math.min(1, 160 / Math.max(img.width, img.height));
  aSample.width = Math.max(1, Math.round(img.width * aScale));
  aSample.height = Math.max(1, Math.round(img.height * aScale));
  const aCtx = aSample.getContext("2d", { willReadFrequently: true });
  if (aCtx) {
    aCtx.drawImage(img, 0, 0, aSample.width, aSample.height);
    const pixels = aCtx.getImageData(0, 0, aSample.width, aSample.height).data;
    signals = computeImageSignals(pixels, aSample.width, aSample.height);
    signature = perceptualHash(pixels, aSample.width, aSample.height);
  }
  const graded = gradeImageQuality(signals, shortestSide);

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
    quality: graded.quality,
    warnings: graded.warnings,
    signals,
    signature,
  };
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

  return inspectDataUrl(source);
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [liveSignal, setLiveSignal] = useState<FrameSignal>({
    brightness: null,
    contrast: null,
    tooDark: false,
    tooBright: false,
    lowDetail: false,
  });
  const [tipIndex, setTipIndex] = useState(0);
  const [tilted, setTilted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentStep = activeStep(photos, analysis);
  const usableCount = photos.filter((photo) => photo.quality !== "unusable").length;
  const reviewCount = photos.filter((photo) => photo.quality === "needs_review").length;
  const unusableCount = photos.filter((photo) => photo.quality === "unusable").length;
  const selectedType = PHOTO_TYPES.find((type) => type.value === photoType) ?? PHOTO_TYPES[0];
  const detailsDetected = Boolean(
    analysis && (analysis.zones.length > 0 || analysis.detectedObjects.length > 0),
  );
  const plantIdentified = Boolean(
    analysis?.detectedObjects.some((item) => item.toLowerCase().includes("plant material")),
  );
  const measurementDetected = Boolean(
    analysis?.detectedObjects.some((item) => item.toLowerCase().includes("measurement")),
  );
  const cameraTip = liveSignal.tooDark
    ? "Too dark. Move closer to daylight."
    : liveSignal.tooBright
      ? "Too much glare. Tilt away from direct sun."
      : liveSignal.lowDetail
        ? "Low detail. Hold steady and step back."
        : tilted
          ? "Straighten your phone with the house or walkway."
          : CAMERA_TIPS[tipIndex % CAMERA_TIPS.length];
  // Block capture only when light AND detail AND level are all bad — a frame this
  // poor would just be rejected on inspection, so stop it before the shutter.
  const captureBlocked =
    cameraReady &&
    (liveSignal.tooDark || liveSignal.tooBright) &&
    liveSignal.lowDetail &&
    tilted;

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
      void (async () => {
        try {
          const base = await analyzeYardPhotos(photos);
          if (!active) return;
          setStatus("Checking optional photo ML...");
          const next = mergeVisionSuggestion(base, await readVisionSuggestion(photos));
          if (!active) return;
          onAnalysis(next);
          setAssumptionEdits((current) => {
            const merged = { ...current };
            for (const item of next.assumptions) merged[item.id] = merged[item.id] ?? item.value;
            return merged;
          });
          setStatus("Photo assumptions ready to confirm");
        } catch {
          // Analysis is optional — never strand the user on a spinner; let them continue manually.
          if (active) setStatus("Couldn't read that photo automatically — you can still continue.");
        } finally {
          if (active) setBusy(false);
          if (stageTimer) window.clearInterval(stageTimer);
        }
      })();
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(setupTimer);
      window.clearTimeout(timer);
      if (stageTimer) window.clearInterval(stageTimer);
    };
  }, [photos, onAnalysis]);

  useEffect(() => {
    const id = window.setInterval(() => setTipIndex((current) => current + 1), 3500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!cameraOpen) return;
    let active = true;
    async function startCamera() {
      setCameraError(null);
      setCameraReady(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera capture is not available in this browser. Use photo upload instead.",
          );
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (error) {
        setCameraError(
          error instanceof Error
            ? error.message
            : "Bloomprint could not open the camera. You can still upload photos.",
        );
      }
    }
    void startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraOpen || !cameraReady) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
      const canvas = document.createElement("canvas");
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setLiveSignal(sampleCanvas(canvas));
    }, 600);
    return () => window.clearInterval(id);
  }, [cameraOpen, cameraReady]);

  useEffect(() => {
    if (!cameraOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCameraOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraOpen) return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0;
      setTilted(Math.abs(gamma) > 18);
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [cameraOpen]);

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
    const knownSignatures = photos.map((photo) => photo.signature).filter(Boolean) as string[];
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
        if (inspected.signature && knownSignatures.some((sig) => areNearDuplicates(sig, inspected.signature))) {
          nextIssues.push({
            id: crypto.randomUUID(),
            fileName: file.name,
            message: "This looks like a near-duplicate of a photo already added. Capture a different angle instead.",
            severity: "warning",
          });
          continue;
        }
        const asset = await saveDraftPhoto({
          sessionId,
          type: photoType,
          dataUrl: inspected.dataUrl,
          fileName: file.name,
          width: inspected.width,
          height: inspected.height,
          quality: inspected.quality,
          warnings: inspected.warnings,
          signature: inspected.signature,
        });
        if (inspected.signature) knownSignatures.push(inspected.signature);
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

  async function addCapturedPhoto(dataUrl: string) {
    if (photos.length >= MAX_PHOTOS) {
      setIssues((current) => [
        {
          id: crypto.randomUUID(),
          fileName: "Camera capture",
          message: `This draft already has ${MAX_PHOTOS} photos. Remove one before capturing another.`,
          severity: "warning",
        },
        ...current,
      ]);
      return;
    }
    setBusy(true);
    setStatus("Checking camera photo locally...");
    try {
      const inspected = await inspectDataUrl(dataUrl);
      const knownSignatures = photos.map((photo) => photo.signature).filter(Boolean) as string[];
      if (
        inspected.signature &&
        knownSignatures.some((sig) => areNearDuplicates(sig, inspected.signature))
      ) {
        setIssues((current) =>
          [
            {
              id: crypto.randomUUID(),
              fileName: "Camera capture",
              message:
                "This looks like a near-duplicate of a photo already added. Capture a different angle instead.",
              severity: "warning" as const,
            },
            ...current,
          ].slice(0, 6),
        );
        return;
      }
      const warnings = [
        ...inspected.warnings,
        ...(tilted
          ? ["Phone looked tilted during capture. Confirm bed edges and measurements."]
          : []),
      ];
      const asset = await saveDraftPhoto({
        sessionId,
        type: photoType,
        dataUrl: inspected.dataUrl,
        fileName: `${photoType}-${new Date().toISOString().replace(/[:.]/g, "-")}.jpg`,
        width: inspected.width,
        height: inspected.height,
        quality:
          warnings.length > 0 && inspected.quality === "good" ? "needs_review" : inspected.quality,
        warnings,
        signature: inspected.signature,
      });
      onPhotos([...photos, asset]);
      if (warnings.length > 0) {
        setIssues((current) =>
          [
            {
              id: crypto.randomUUID(),
              fileName: "Camera capture",
              message: warnings[0],
              severity: asset.quality === "unusable" ? ("error" as const) : ("warning" as const),
            },
            ...current,
          ].slice(0, 6),
        );
      }
      setCameraOpen(false);
      setStatus("Camera photo saved locally");
    } catch (error) {
      setIssues((current) =>
        [
          {
            id: crypto.randomUUID(),
            fileName: "Camera capture",
            message:
              error instanceof Error ? error.message : "This camera photo could not be processed.",
            severity: "error" as const,
          },
          ...current,
        ].slice(0, 6),
      );
    } finally {
      setBusy(false);
    }
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera is still warming up. Try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError("Your browser could not capture this frame.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    void addCapturedPhoto(canvas.toDataURL("image/jpeg", 0.86));
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
              suppressHydrationWarning
              onChange={(e) => e.target.files && void addFiles(e.target.files)}
            />

            <div
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
                Take guided photos or upload existing images
              </span>
              <span className="mt-1 max-w-md text-xs text-muted">
                Camera mode adds gridlines, framing templates, and live lighting hints. Uploads use
                the same local quality checks.
              </span>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setCameraOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
                >
                  <Camera className="size-4" aria-hidden />
                  Open guided camera
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition hover:border-brand"
                >
                  Upload photos
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Example shots</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {EXAMPLE_SHOTS.map((shot) => (
              <button
                key={shot.type}
                type="button"
                onClick={() => setPhotoType(shot.type)}
                className={`overflow-hidden rounded-xl border text-left transition hover:border-brand ${
                  photoType === shot.type
                    ? "border-brand bg-brand-soft"
                    : "border-border bg-surface"
                }`}
              >
                <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,var(--brand-soft),var(--surface))]">
                  <div className="absolute inset-x-4 bottom-4 h-8 rounded-t-lg border border-brand/25 bg-surface/70" />
                  <div className="absolute bottom-4 left-8 h-12 w-7 rounded-full bg-brand/25" />
                  <div className="absolute bottom-4 right-8 h-16 w-8 rounded-full bg-brand/30" />
                  {shot.overlay === "wide" ? (
                    <div className="absolute inset-5 rounded-lg border-2 border-dashed border-brand/60" />
                  ) : null}
                  {shot.overlay === "plant" ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-brand/70 bg-surface/50">
                        <Leaf className="size-8 text-brand" aria-hidden />
                      </div>
                    </div>
                  ) : null}
                  {shot.overlay === "measure" ? (
                    <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-brand/70" />
                      <Ruler className="size-6 text-brand" aria-hidden />
                    </div>
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-foreground">{shot.title}</p>
                  <p className="mt-1 text-xs text-muted">{shot.desc}</p>
                </div>
              </button>
            ))}
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
                      alt={`${PHOTO_TYPES.find((type) => type.value === photo.type)?.label ?? "Yard"} photo ${index + 1}`}
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
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <ReadinessCheck
                label="Details detected"
                value={detailsDetected}
                yes="Zones or constraints found"
                no="Add a wide context photo"
              />
              <ReadinessCheck
                label="Plant identified"
                value={plantIdentified}
                yes="Plant material visible"
                no="Add existing-plant close-up"
              />
              <ReadinessCheck
                label="Measurements seen"
                value={measurementDetected}
                yes="Measurement reference present"
                no="Add dimensions manually"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
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
                          setAssumptionEdits((current) => ({
                            ...current,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="min-h-16 rounded-lg border border-border bg-surface p-2 text-sm text-foreground"
                        disabled={!item.editable}
                      />
                    </label>
                  ))}
                </div>
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

      {cameraOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Guided camera"
        >
          <div className="flex max-h-[96vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Guided camera</p>
                <p className="text-xs text-muted">
                  {selectedType.label}: {selectedType.hint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="ml-auto rounded-full border border-border p-2 text-muted transition hover:text-foreground"
                aria-label="Close camera"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <div className="relative aspect-[3/4] bg-black">
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />

              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, index) => (
                  <div
                    key={index}
                    className={`${index % 3 !== 2 ? "border-r" : ""} ${
                      index < 6 ? "border-b" : ""
                    } border-white/25`}
                  />
                ))}
              </div>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`border-2 border-dashed ${
                    photoType === "measurement"
                      ? "h-20 w-64 rounded-lg border-sky-300/80"
                      : photoType === "existing_plants"
                        ? "size-44 rounded-full border-lime-300/80"
                        : "h-56 w-64 rounded-2xl border-yellow-300/80"
                  }`}
                />
              </div>

              <div className="pointer-events-none absolute left-0 right-0 top-3 flex justify-center px-3">
                <span className="rounded-full border border-white/15 bg-black/70 px-4 py-1.5 text-center text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                  {cameraTip}
                </span>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2 text-[11px]">
                <LiveMetric label="Light" ok={!liveSignal.tooDark && !liveSignal.tooBright} />
                <LiveMetric label="Detail" ok={!liveSignal.lowDetail} />
                <LiveMetric label="Level" ok={!tilted} />
              </div>

              {(liveSignal.tooDark || liveSignal.tooBright || liveSignal.lowDetail) && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-danger/10">
                  <span className="rounded-full bg-danger px-3 py-1 text-xs font-bold uppercase tracking-wide text-on-strong">
                    Check photo before capture
                  </span>
                </div>
              )}

              {!cameraReady ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white">
                  <div className="text-center">
                    <Loader2 className="mx-auto mb-2 size-6 animate-spin" aria-hidden />
                    <p className="text-sm font-semibold">
                      {cameraError ? "Camera unavailable" : "Opening camera..."}
                    </p>
                    {cameraError ? (
                      <p className="mt-1 max-w-xs text-xs text-white/75">{cameraError}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 p-3">
              <div className="grid grid-cols-3 gap-2">
                {(["front_yard", "existing_plants", "measurement"] as PhotoAssetType[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPhotoType(type)}
                      className={`rounded-xl border px-2 py-2 text-xs font-semibold ${
                        photoType === type
                          ? "border-brand bg-brand-soft text-brand-strong"
                          : "border-border text-muted"
                      }`}
                    >
                      {PHOTO_TYPES.find((item) => item.value === type)?.label}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={captureFromCamera}
                disabled={!cameraReady || busy || captureBlocked}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
              >
                <Maximize2 className="size-4" aria-hidden />
                {captureBlocked ? "Adjust the shot to capture" : "Capture guided photo"}
              </button>
              {captureBlocked ? (
                <p className="text-center text-xs font-medium text-danger">
                  Lighting, detail, and level all need fixing before this photo is usable.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
              >
                Use upload instead
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReadinessCheck({
  label,
  value,
  yes,
  no,
}: {
  label: string;
  value: boolean;
  yes: string;
  no: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="flex items-center gap-2">
        {value ? (
          <CheckCircle2 className="size-4 text-brand" aria-hidden />
        ) : (
          <AlertTriangle className="size-4 text-[var(--warn)]" aria-hidden />
        )}
        <p className="text-sm font-semibold text-foreground">{label}</p>
      </div>
      <p className="mt-1 text-xs text-muted">{value ? `Yes — ${yes}` : `No — ${no}`}</p>
    </div>
  );
}

function LiveMetric({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`rounded-full border px-2 py-1 text-center font-semibold ${
        ok ? "border-white/20 bg-black/55 text-white" : "border-danger/40 bg-danger text-on-strong"
      }`}
    >
      {label}: {ok ? "OK" : "Fix"}
    </div>
  );
}
