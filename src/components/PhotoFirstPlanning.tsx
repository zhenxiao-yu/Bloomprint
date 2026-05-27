"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { z } from "zod";
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
  Ruler,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Upload,
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
import {
  analyzeYardPhotos,
  derivePhotoIntake,
  estimateConfidenceFromPhotoData,
} from "@/lib/workspace/photoAnalysis";
import { saveDraftPhoto } from "@/lib/workspace/draftStore";
import { ConfidenceBadge } from "@/components/plan/TrustBadges";
import {
  analyzeRegions,
  areNearDuplicates,
  computeImageSignals,
  gradeImageQuality,
  NEUTRAL_SIGNALS,
  perceptualHash,
  type ImageSignals,
  type RegionClass,
  type RegionSummary,
} from "@/lib/workspace/imageSignals";

const MAX_PHOTOS = 8;
const MAX_FILE_MB = 12;

type Translator = ReturnType<typeof useTranslations>;

// Display text (label/hint/desc/title) is resolved with t() at render — the
// constants carry only stable keys and presentation metadata (value/icon/overlay).
const PHOTO_TYPES: { value: PhotoAssetType }[] = [
  { value: "front_yard" },
  { value: "backyard" },
  { value: "side_yard" },
  { value: "problem_area" },
  { value: "existing_plants" },
  { value: "soil_drainage" },
  { value: "measurement" },
  { value: "inspiration" },
];

const PROJECT_TYPES: { value: ProjectKind; icon: typeof Home }[] = [
  { value: "my_home", icon: Home },
  { value: "client_property", icon: Users },
  { value: "store_customer", icon: Store },
];

const STEPS = [{ key: "project" }, { key: "photos" }, { key: "confirm" }] as const;

const CAMERA_TIP_COUNT = 4;

const EXAMPLE_SHOTS: {
  type: PhotoAssetType;
  overlay: "wide" | "plant" | "measure";
}[] = [
  { type: "front_yard", overlay: "wide" },
  { type: "existing_plants", overlay: "plant" },
  { type: "measurement", overlay: "measure" },
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

// Validate the vision endpoint's payload at the boundary — an upstream/model change
// can never inject an unexpected shape into the honest-AI presentation below.
const VisionSuggestionSchema = z.object({
  sun: z.string().optional(),
  observations: z.array(z.string()).optional(),
  note: z.string().optional(),
});
type VisionSuggestion = z.infer<typeof VisionSuggestionSchema>;

/** Stable id for a UI issue. `crypto.randomUUID` is missing on some insecure origins. */
function issueId(): string {
  return crypto.randomUUID?.() ?? `issue-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function qualityLabel(quality: PhotoQuality | undefined, t: Translator): string {
  if (quality === "unusable") return t("quality_retake");
  if (quality === "needs_review") return t("quality_needsReview");
  return t("quality_good");
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

function sunLabel(value: string, t: Translator): string {
  if (value === "full-sun") return t("confidenceFullSun");
  if (value === "part-sun") return t("confidencePartSun");
  if (value === "shade") return t("confidenceShade");
  return t("confidenceUnknownSun");
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
    const data = (await res.json()) as { suggestion?: unknown };
    const parsed = VisionSuggestionSchema.safeParse(data.suggestion);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const REGION_COLS = 6;
const REGION_ROWS = 4;

/** Decode the first usable photo and compute a pixel-grounded region read for the overlay. */
async function analyzeFirstPhotoRegions(photos: PhotoAsset[]): Promise<RegionSummary | null> {
  const photo = photos.find((item) => item.quality !== "unusable" && item.previewUrl);
  if (!photo?.previewUrl) return null;
  const src = photo.previewUrl;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode failed"));
      image.src = src;
    });
    const cw = 96;
    const ch = 64;
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    const { data } = ctx.getImageData(0, 0, cw, ch);
    return analyzeRegions(data, cw, ch, REGION_COLS, REGION_ROWS);
  } catch {
    return null;
  }
}

const REGION_STYLE: Record<RegionClass, { fill: string }> = {
  greenery: { fill: "rgba(34,197,94,0.30)" },
  hardscape: { fill: "rgba(148,163,184,0.34)" },
  sky: { fill: "rgba(56,189,248,0.26)" },
  shadow: { fill: "rgba(30,41,59,0.40)" },
  mixed: { fill: "rgba(0,0,0,0)" },
};

const REGION_LABEL_KEY: Record<RegionClass, string> = {
  greenery: "region_greenery_label",
  hardscape: "region_hardscape_label",
  sky: "region_sky_label",
  shadow: "region_shadow_label",
  mixed: "region_mixed_label",
};

function regionLabel(cls: RegionClass, t: Translator): string {
  return t(REGION_LABEL_KEY[cls]);
}

function mergeVisionSuggestion(
  analysis: PhotoAnalysisResult,
  suggestion: VisionSuggestion | null,
  t: Translator,
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
            value: `Photo ML estimates ${sunLabel(suggestion.sun, t)}. Please confirm before buying plants.`,
            confidence: "medium",
          }
        : item,
    ),
    // A free-form model note is never presented as a fact — it's hedged like the other
    // vision-derived fields (honest-AI contract: AI explains, it never asserts).
    risks: [
      ...analysis.risks,
      ...(suggestion.note ? [`Photo ML thinks (unconfirmed): ${suggestion.note}`] : []),
    ],
    confidence: Math.min(0.82, analysis.confidence + (observations.length > 0 ? 0.04 : 0)),
  };
}

/** Live-camera read: brightness/detail flags plus how much of the frame is yard. */
function readLiveFrame(canvas: HTMLCanvasElement): { signal: FrameSignal; fill: number } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return {
      signal: {
        brightness: null,
        contrast: null,
        tooDark: false,
        tooBright: false,
        lowDetail: false,
      },
      fill: 1,
    };
  }
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const s = computeImageSignals(data, canvas.width, canvas.height);
  return {
    signal: {
      brightness: s.brightness,
      contrast: s.contrast,
      tooDark: s.brightness < 38,
      tooBright: s.brightness > 238,
      lowDetail: s.contrast < 9,
    },
    // Vegetation + hardscape ≈ "actual yard content"; a near-empty frame trends to 0.
    fill: s.greenRatio + s.hardscapeRatio,
  };
}

async function inspectDataUrl(source: string, t: Translator): Promise<ImageInspection> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t("errorCouldNotOpen")));
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
  if (!ctx) throw new Error(t("errorBrowserProcess"));
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

async function inspectAndCompress(file: File, t: Translator): Promise<ImageInspection> {
  if (!file.type.startsWith("image/")) {
    throw new Error(t("errorNotImage"));
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    throw new Error(t("errorTooLarge", { max: MAX_FILE_MB }));
  }

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(t("errorCouldNotRead")));
    reader.readAsDataURL(file);
  });

  return inspectDataUrl(source, t);
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
  const t = useTranslations("PhotoIntake");
  const [photoType, setPhotoType] = useState<PhotoAssetType>("front_yard");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(() => t("statusDraftSaved"));
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
  const [liveFill, setLiveFill] = useState(1);
  const [regionSummary, setRegionSummary] = useState<RegionSummary | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  // Phones/tablets get the guided camera; desktop defaults shot actions to upload.
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Latest-committed photos, read at await-resume so concurrent/slow adds never
  // commit against a stale list and silently drop an interleaved change.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  // Guards setState after awaits so a mid-upload unmount (user navigates away)
  // doesn't warn or touch a torn-down tree.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const currentStep = activeStep(photos, analysis);
  const usableCount = photos.filter((photo) => photo.quality !== "unusable").length;
  const reviewCount = photos.filter((photo) => photo.quality === "needs_review").length;
  const unusableCount = photos.filter((photo) => photo.quality === "unusable").length;
  // Live "capture plan": which recommended shots are present, confidence so far,
  // and the single best next shot to coach toward.
  const presentTypes = new Set(photos.map((photo) => photo.type));
  const liveConfidence = Math.round(estimateConfidenceFromPhotoData(photos) * 100);
  const nextShot = EXAMPLE_SHOTS.find((shot) => !presentTypes.has(shot.type));
  const heroPhoto =
    photos.find((photo) => photo.quality !== "unusable" && photo.previewUrl) ?? null;

  // Pixel-grounded "I can see…" chips: real ratios from the photo + any vision ML notes.
  const sceneChips = useMemo(() => {
    const chips: { label: string; tone: "green" | "neutral" | "sky" | "shade" }[] = [];
    if (regionSummary) {
      if (regionSummary.greenRatio > 0.18)
        chips.push({ label: t("sceneChipGreenery"), tone: "green" });
      if (regionSummary.hardscapeRatio > 0.18)
        chips.push({ label: t("sceneChipHardscape"), tone: "neutral" });
      if (regionSummary.skyRatio > 0.16) chips.push({ label: t("sceneChipSky"), tone: "sky" });
      if (regionSummary.shadowRatio > 0.28) chips.push({ label: t("sceneChipShade"), tone: "shade" });
    }
    for (const obj of analysis?.detectedObjects ?? []) {
      if (obj.toLowerCase().startsWith("photo ml observation")) {
        chips.push({ label: obj.replace(/^photo ML observation:\s*/i, ""), tone: "neutral" });
      }
    }
    return chips.slice(0, 6);
  }, [regionSummary, analysis, t]);

  const draftRead = useMemo(() => {
    if (!analysis) return null;
    const parts: string[] = [];
    if (regionSummary) {
      const { greenRatio: g, hardscapeRatio: h, skyRatio: s, shadowRatio: d } = regionSummary;
      if (g > h && g > 0.2) parts.push(t("draftReadMostlyGreenery"));
      else if (h > g && h > 0.2) parts.push(t("draftReadLotsHardSurface"));
      else if (g > 0.1 || h > 0.1) parts.push(t("draftReadMix"));
      if (s > 0.2) parts.push(t("draftReadBrightLight"));
      else if (d > 0.3) parts.push(t("draftReadShadierLight"));
    }
    return t("draftRead", { parts: parts.length ? parts.join(", ") : t("draftReadYourYard") });
  }, [analysis, regionSummary, t]);

  const coverageFor = (cls: RegionClass): number => {
    if (!regionSummary) return 0;
    if (cls === "greenery") return regionSummary.greenRatio;
    if (cls === "hardscape") return regionSummary.hardscapeRatio;
    if (cls === "sky") return regionSummary.skyRatio;
    if (cls === "shadow") return regionSummary.shadowRatio;
    return 0;
  };
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
    ? t("cameraTipTooDark")
    : liveSignal.tooBright
      ? t("cameraTipTooBright")
      : liveSignal.lowDetail
        ? t("cameraTipLowDetail")
        : tilted
          ? t("cameraTipStraighten")
          : liveFill < 0.12
            ? t("cameraTipFillFrame")
            : t(`cameraTip_${tipIndex % CAMERA_TIP_COUNT}`);
  // Block capture only when light AND detail AND level are all bad — a frame this
  // poor would just be rejected on inspection, so stop it before the shutter.
  const captureBlocked =
    cameraReady && (liveSignal.tooDark || liveSignal.tooBright) && liveSignal.lowDetail && tilted;

  const analysisStatus = useMemo(() => {
    if (busy) return status;
    if (analysis)
      return t("statusConfidence", { percent: Math.round(analysis.confidence * 100) });
    if (photos.length > 0) return t("statusPreparing");
    return t("statusUploadOrContinue");
  }, [analysis, busy, photos.length, status, t]);

  useEffect(() => {
    // Coarse pointer ≈ phone/tablet → guided camera is useful; otherwise prefer upload.
    setIsMobile(window.matchMedia?.("(pointer: coarse)").matches ?? false);
  }, []);

  useEffect(() => {
    if (photos.length === 0) {
      onAnalysis(null);
      const reset = window.setTimeout(() => {
        setAssumptionEdits({});
        setRegionSummary(null);
      }, 0);
      return () => window.clearTimeout(reset);
    }
    let active = true;
    // Short debounce so rapid reorders/type changes don't thrash the pipeline.
    const timer = window.setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          // Each status reflects a real step, not a faked timer.
          setStatus(t("statusReadingPhoto"));
          const base = await analyzeYardPhotos(photos);
          if (!active) return;
          setStatus(t("statusMappingSurfaces"));
          const region = await analyzeFirstPhotoRegions(photos);
          if (!active) return;
          setRegionSummary(region);
          setStatus(t("statusCheckingVision"));
          const suggestion = await readVisionSuggestion(photos);
          if (!active) return;
          const merged = mergeVisionSuggestion(base, suggestion, t);
          const next: PhotoAnalysisResult = {
            ...merged,
            derived: derivePhotoIntake({
              photoTypes: photos.filter((p) => p.quality !== "unusable").map((p) => p.type),
              region,
              visionSun: suggestion?.sun,
            }),
          };
          onAnalysis(next);
          setAssumptionEdits((current) => {
            const merged = { ...current };
            for (const item of next.assumptions) merged[item.id] = merged[item.id] ?? item.value;
            return merged;
          });
          setStatus(t("statusAssumptionsReady"));
        } catch {
          // Analysis is optional — never strand the user on a spinner; let them continue manually.
          if (active) setStatus(t("statusCouldNotRead"));
        } finally {
          if (active) setBusy(false);
        }
      })();
    }, 450);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [photos, onAnalysis, t]);

  useEffect(() => {
    // Tips only show in the camera modal — don't re-render the whole tree otherwise.
    if (!cameraOpen) return;
    const id = window.setInterval(() => setTipIndex((current) => current + 1), 3500);
    return () => window.clearInterval(id);
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraOpen) return;
    let active = true;
    async function startCamera() {
      setCameraError(null);
      setCameraReady(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(t("cameraErrorNotAvailable"));
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
        setCameraError(error instanceof Error ? error.message : t("cameraErrorCouldNotOpen"));
      }
    }
    void startCamera();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraReady(false);
    };
  }, [cameraOpen, t]);

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
      const { signal, fill } = readLiveFrame(canvas);
      setLiveSignal(signal);
      setLiveFill(fill);
    }, 600);
    return () => window.clearInterval(id);
  }, [cameraOpen, cameraReady]);

  useEffect(() => {
    if (!cameraOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCameraOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
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
    setStatus(t("statusCheckingCompressing"));
    const remaining = Math.max(0, MAX_PHOTOS - photosRef.current.length);
    const incoming = allIncoming.slice(0, remaining);
    const nextIssues: PhotoIssue[] = [];
    if (allIncoming.length > remaining) {
      nextIssues.push({
        id: issueId(),
        fileName: t("issueFileNamePhotoLimit"),
        message: t("photoLimit", { max: MAX_PHOTOS }),
        severity: "warning",
      });
    }

    const existingNames = new Set(photosRef.current.map((photo) => photo.fileName).filter(Boolean));
    const knownSignatures = photosRef.current
      .map((photo) => photo.signature)
      .filter(Boolean) as string[];
    const next: PhotoAsset[] = [];
    for (const file of incoming) {
      try {
        if (existingNames.has(file.name)) {
          nextIssues.push({
            id: issueId(),
            fileName: file.name,
            message: t("issueDuplicateName"),
            severity: "warning",
          });
          continue;
        }
        const inspected = await inspectAndCompress(file, t);
        if (
          inspected.signature &&
          knownSignatures.some((sig) => areNearDuplicates(sig, inspected.signature))
        ) {
          nextIssues.push({
            id: issueId(),
            fileName: file.name,
            message: t("issueNearDuplicate"),
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
            id: issueId(),
            fileName: file.name,
            message: inspected.warnings[0],
            severity: inspected.quality === "unusable" ? "error" : "warning",
          });
        }
      } catch (error) {
        nextIssues.push({
          id: issueId(),
          fileName: file.name,
          message: error instanceof Error ? error.message : t("errorPhotoNotProcessed"),
          severity: "error",
        });
      }
    }
    // The user may have navigated away during the per-file awaits above.
    if (!mountedRef.current) return;
    setIssues((current) => [...nextIssues, ...current].slice(0, 6));
    // Commit against the latest committed list, not the one captured before awaits.
    if (next.length > 0) onPhotos([...photosRef.current, ...next]);
    setStatus(next.length > 0 ? t("statusPhotosSaved") : t("statusNoUsablePhotos"));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function addCapturedPhoto(dataUrl: string) {
    if (photosRef.current.length >= MAX_PHOTOS) {
      setIssues((current) => [
        {
          id: issueId(),
          fileName: t("issueFileNameCameraCapture"),
          message: t("cameraMaxPhotos", { max: MAX_PHOTOS }),
          severity: "warning",
        },
        ...current,
      ]);
      return;
    }
    setBusy(true);
    setStatus(t("statusCheckingCameraPhoto"));
    try {
      const inspected = await inspectDataUrl(dataUrl, t);
      if (!mountedRef.current) return;
      const knownSignatures = photosRef.current
        .map((photo) => photo.signature)
        .filter(Boolean) as string[];
      if (
        inspected.signature &&
        knownSignatures.some((sig) => areNearDuplicates(sig, inspected.signature))
      ) {
        setIssues((current) =>
          [
            {
              id: issueId(),
              fileName: t("issueFileNameCameraCapture"),
              message: t("issueNearDuplicate"),
              severity: "warning" as const,
            },
            ...current,
          ].slice(0, 6),
        );
        return;
      }
      const warnings = [
        ...inspected.warnings,
        ...(tilted ? [t("warningTilted")] : []),
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
      if (!mountedRef.current) return;
      onPhotos([...photosRef.current, asset]);
      if (warnings.length > 0) {
        setIssues((current) =>
          [
            {
              id: issueId(),
              fileName: t("issueFileNameCameraCapture"),
              message: warnings[0],
              severity: asset.quality === "unusable" ? ("error" as const) : ("warning" as const),
            },
            ...current,
          ].slice(0, 6),
        );
      }
      setCameraOpen(false);
      setStatus(t("statusCameraPhotoSaved"));
    } catch (error) {
      if (!mountedRef.current) return;
      setIssues((current) =>
        [
          {
            id: issueId(),
            fileName: t("issueFileNameCameraCapture"),
            message: error instanceof Error ? error.message : t("errorCameraPhotoNotProcessed"),
            severity: "error" as const,
          },
          ...current,
        ].slice(0, 6),
      );
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError(t("cameraStillWarming"));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCameraError(t("cameraCouldNotCapture"));
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    void addCapturedPhoto(canvas.toDataURL("image/jpeg", 0.86));
  }

  // Add a shot of a given type from the best source for the device: the guided
  // camera on phones/tablets, the file picker on desktop (where a webcam is no
  // help for photographing a yard). Both feed the same review pipeline.
  function addShotOfType(type: PhotoAssetType) {
    setPhotoType(type);
    if (isMobile) setCameraOpen(true);
    else inputRef.current?.click();
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
    // Sits in the comfortable intake column alongside the form; no viewport breakout.
    <div className="min-w-0">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="overflow-hidden rounded-[1.5rem] border border-border bg-surface shadow-sm sm:rounded-2xl">
          <div className="bg-brand-soft p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                  {t("headerEyebrow")}
                </p>
                <h1 className="mt-1 text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                  {t("headerTitle")}
                </h1>
                <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-muted sm:line-clamp-none">
                  {t("headerSubtitle")}
                </p>
              </div>
              <div className="hidden rounded-2xl border border-brand/20 bg-surface/80 p-3 text-xs text-muted shadow-sm sm:block">
                <p className="font-semibold text-foreground">{t("autosaveTitle")}</p>
                <p className="mt-1">{t("autosaveBody")}</p>
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
                    className={`rounded-2xl border px-3 py-2 text-xs transition ${
                      active
                        ? "border-brand bg-surface text-foreground shadow-sm"
                        : done
                          ? "border-brand/20 bg-surface/70 text-brand-strong"
                          : "border-border bg-surface/50 text-muted"
                    }`}
                  >
                    <span className="block font-semibold">
                      {index + 1}. {t(`step_${step.key}_label`)}
                    </span>
                    <span className="mt-0.5 block">{done ? t("stepReady") : t("stepNext")}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-3 sm:p-5">
            {PROJECT_TYPES.map(({ value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onProjectKind(value)}
                aria-pressed={projectKind === value}
                className={`rounded-2xl border p-2 text-left transition hover:border-brand hover:shadow-sm sm:p-3 ${
                  projectKind === value ? "border-brand bg-brand-soft" : "border-border bg-surface"
                }`}
              >
                <Icon className="mb-1 size-5 text-brand sm:mb-2" aria-hidden />
                <span className="block text-xs font-semibold leading-tight text-foreground sm:text-sm">
                  {t(`projectType_${value}_label`)}
                </span>
                <span className="mt-1 hidden text-xs text-muted sm:block">
                  {t(`projectType_${value}_desc`)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-sm sm:rounded-2xl sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("photoIntakeHeading")}</h2>
              <p className="mt-1 text-sm text-muted">{t("photoIntakeSubtitle")}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs text-muted">
              <ShieldCheck className="size-4 text-brand" aria-hidden />
              {t("usableSummary", {
                usable: usableCount,
                review: reviewCount,
                unusable: unusableCount,
              })}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-background/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t("capturePlan")}
              </p>
              <span className="text-xs font-semibold text-brand-strong">
                {t("photoConfidence", { percent: liveConfidence })}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${liveConfidence}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {nextShot
                ? t("nextBestShot", {
                    title: t(`exampleShot_${nextShot.type}_title`).toLowerCase(),
                    desc: t(`exampleShot_${nextShot.type}_desc`),
                  })
                : t("greatCoverage")}
            </p>
            <div className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
              {EXAMPLE_SHOTS.map((shot) => {
                const done = presentTypes.has(shot.type);
                return (
                  <button
                    key={shot.type}
                    type="button"
                    onClick={() => addShotOfType(shot.type)}
                    className={`flex min-w-[10.75rem] snap-start items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs transition sm:min-w-0 ${
                      done
                        ? "border-brand/30 bg-brand-soft text-brand-strong"
                        : "border-border bg-surface text-foreground hover:border-brand"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-brand" aria-hidden />
                    ) : isMobile ? (
                      <Camera className="size-4 shrink-0 text-muted" aria-hidden />
                    ) : (
                      <Upload className="size-4 shrink-0 text-muted" aria-hidden />
                    )}
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {t(`exampleShot_${shot.type}_title`)}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {done ? t("shotAdded") : isMobile ? t("shotTapToAdd") : t("shotUpload")}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
            <div className="rounded-2xl border border-border bg-background/60 p-3">
              <label
                htmlFor="photo-type"
                className="text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {t("labelNextPhotos")}
              </label>
              <select
                id="photo-type"
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value as PhotoAssetType)}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface p-2 text-sm text-foreground"
              >
                {PHOTO_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {t(`photoType_${type.value}_label`)}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-muted">{t(`photoType_${selectedType.value}_hint`)}</p>
              <div className="mt-3 rounded-2xl bg-brand-soft p-3 text-xs text-brand-strong">
                {t("betterPhotos")}
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
                className={`flex min-h-56 w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed p-5 text-center transition sm:min-h-44 ${
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
                <span className="text-base font-semibold text-foreground sm:text-sm">
                  {isMobile ? t("dropzoneTitleMobile") : t("dropzoneTitleDesktop")}
                </span>
                <span className="mt-1 max-w-md text-xs text-muted">
                  {isMobile ? t("dropzoneBodyMobile") : t("dropzoneBodyDesktop")}
                </span>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2 text-sm font-semibold text-on-strong transition hover:bg-brand-strong"
                  >
                    <Upload className="size-4" aria-hidden />
                    {t("uploadPhotos")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold transition hover:border-brand"
                  >
                    <Camera className="size-4" aria-hidden />
                    {isMobile ? t("openGuidedCamera") : t("useCamera")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t("exampleShots")}
            </p>
            <div className="-mx-1 mt-2 flex snap-x gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
              {EXAMPLE_SHOTS.map((shot) => (
                <button
                  key={shot.type}
                  type="button"
                  onClick={() => setPhotoType(shot.type)}
                  className={`min-w-[12rem] snap-start overflow-hidden rounded-2xl border text-left transition hover:border-brand sm:min-w-0 ${
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
                    <p className="text-sm font-semibold text-foreground">
                      {t(`exampleShot_${shot.type}_title`)}
                    </p>
                    <p className="mt-1 text-xs text-muted">{t(`exampleShot_${shot.type}_desc`)}</p>
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo, index) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
                >
                  <div className="relative">
                    {photo.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.previewUrl}
                        alt={t("photoAlt", {
                          label: PHOTO_TYPES.some((type) => type.value === photo.type)
                            ? t(`photoType_${photo.type}_label`)
                            : t("yardFallback"),
                          index: index + 1,
                        })}
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
                      {qualityLabel(photo.quality, t)}
                    </span>
                  </div>
                  <figcaption className="flex flex-col gap-2 p-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand-strong">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted">
                        {photo.fileName ?? t("yardPhotoFallback")}
                      </span>
                    </div>
                    <select
                      value={photo.type}
                      onChange={(e) => updatePhotoType(photo.id, e.target.value as PhotoAssetType)}
                      className="min-h-11 w-full rounded-xl border border-border bg-background p-2 text-xs text-foreground"
                      aria-label={t("photoTypeAria")}
                    >
                      {PHOTO_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {t(`photoType_${type.value}_label`)}
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
                        aria-label={t("movePhotoEarlier")}
                      >
                        <ArrowUp className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.id, 1)}
                        disabled={index === photos.length - 1}
                        className="rounded-full border border-border p-1.5 text-muted transition hover:text-foreground disabled:opacity-40"
                        aria-label={t("movePhotoLater")}
                      >
                        <ArrowDown className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => addShotOfType(photo.type)}
                        className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition ${
                          photo.quality === "good"
                            ? "border-border text-muted hover:border-brand hover:text-foreground"
                            : "border-brand/40 bg-brand-soft text-brand-strong"
                        }`}
                      >
                        {isMobile ? (
                          <Camera className="size-3.5" aria-hidden />
                        ) : (
                          <Upload className="size-3.5" aria-hidden />
                        )}
                        {isMobile ? t("retake") : t("replace")}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-semibold text-danger transition hover:border-danger/40"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        {t("remove")}
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
              <h2 className="text-lg font-semibold text-foreground">{t("confirmHeading")}</h2>
            </div>
            <span className="text-xs text-muted sm:ml-auto">{analysisStatus}</span>
          </div>

          {analysis ? (
            <div className="mt-4 flex flex-col gap-4">
              {draftRead ? (
                <div className="flex items-start gap-2 rounded-xl border border-brand/25 bg-brand-soft p-3">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <p className="text-sm font-medium text-brand-strong">{draftRead}</p>
                </div>
              ) : null}

              {heroPhoto?.previewUrl && regionSummary ? (
                <div className="rounded-xl border border-border bg-background/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t("whatBloomprintSees")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">{t("whatBloomprintSeesBody")}</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
                    <div className="relative overflow-hidden rounded-lg border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroPhoto.previewUrl}
                        alt={t("heroPhotoAlt")}
                        className="aspect-[3/2] w-full object-cover"
                      />
                      <div
                        className="absolute inset-0 grid"
                        style={{
                          gridTemplateColumns: `repeat(${regionSummary.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${regionSummary.rows}, 1fr)`,
                        }}
                      >
                        {regionSummary.cells.map((cell, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedCell(selectedCell === i ? null : i)}
                            aria-pressed={selectedCell === i}
                            className={`transition ${selectedCell === i ? "ring-2 ring-inset ring-white" : ""}`}
                            style={{ backgroundColor: REGION_STYLE[cell.cls].fill }}
                            aria-label={t("cellAria", {
                              label: regionLabel(cell.cls, t),
                              index: i + 1,
                              total: regionSummary.cells.length,
                              percent: Math.round(coverageFor(cell.cls) * 100),
                            })}
                          />
                        ))}
                      </div>
                      {selectedCell !== null && regionSummary.cells[selectedCell] ? (
                        <div
                          className="absolute inset-x-2 bottom-2 rounded-lg bg-black/75 px-3 py-1.5 text-xs text-white"
                          aria-live="polite"
                        >
                          {t("cellDetail", {
                            label: regionLabel(regionSummary.cells[selectedCell].cls, t),
                            percent: Math.round(
                              coverageFor(regionSummary.cells[selectedCell].cls) * 100,
                            ),
                          })}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {sceneChips.length > 0 ? (
                          sceneChips.map((chip, i) => (
                            <span
                              key={`${chip.label}-${i}`}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                chip.tone === "green"
                                  ? "bg-brand-soft text-brand-strong"
                                  : chip.tone === "sky"
                                    ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                    : chip.tone === "shade"
                                      ? "bg-slate-500/15 text-slate-600 dark:text-slate-300"
                                      : "bg-border/70 text-muted"
                              }`}
                            >
                              {chip.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted">{t("notEnoughDetail")}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          {t("greeneryVsHard")}
                        </p>
                        <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-border">
                          <div
                            className="bg-brand"
                            style={{ width: `${Math.round(regionSummary.greenRatio * 100)}%` }}
                          />
                          <div
                            className="bg-slate-400"
                            style={{ width: `${Math.round(regionSummary.hardscapeRatio * 100)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          {t("greeneryHardSummary", {
                            green: Math.round(regionSummary.greenRatio * 100),
                            hard: Math.round(regionSummary.hardscapeRatio * 100),
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <ReadinessCheck
                  label={t("readinessDetailsLabel")}
                  value={detailsDetected}
                  yes={t("readinessDetailsYes")}
                  no={t("readinessDetailsNo")}
                  t={t}
                />
                <ReadinessCheck
                  label={t("readinessPlantLabel")}
                  value={plantIdentified}
                  yes={t("readinessPlantYes")}
                  no={t("readinessPlantNo")}
                  t={t}
                />
                <ReadinessCheck
                  label={t("readinessMeasureLabel")}
                  value={measurementDetected}
                  yes={t("readinessMeasureYes")}
                  no={t("readinessMeasureNo")}
                  t={t}
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t("detectedZones")}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {analysis.zones.length > 0 ? (
                        analysis.zones.map((zone) => (
                          <li
                            key={zone.id}
                            className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-strong"
                          >
                            {t("zoneItem", {
                              label: zone.label,
                              percent: Math.round(zone.confidence * 100),
                            })}
                          </li>
                        ))
                      ) : (
                        <li className="rounded-lg bg-border/50 px-3 py-2 text-sm text-muted">
                          {t("noUsableInfo")}
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {t("needsChecking")}
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
                    {t("editableAssumptions")}
                  </p>
                  <div className="mt-3 flex flex-col gap-3">
                    {analysis.assumptions.map((item) => (
                      <label key={item.id} className="flex flex-col gap-1 text-sm">
                        <span className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                          {item.label}
                          {/* Shared trust language with the plan workspace (Phase 4) — same
                              calm confidence read, with a tooltip explainer. */}
                          <ConfidenceBadge level={item.confidence} />
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
              <p className="text-sm font-semibold text-foreground">{t("noAssumptionsTitle")}</p>
              <p className="mt-1 text-sm text-muted">{t("noAssumptionsBody")}</p>
            </div>
          )}

          <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 mt-4 flex flex-col gap-2 rounded-3xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur sm:static sm:flex-row sm:items-center sm:rounded-2xl sm:shadow-none">
            <button
              type="button"
              onClick={confirmAndContinue}
              disabled={busy}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-on-strong transition hover:bg-brand-strong disabled:opacity-50"
            >
              <ClipboardEdit className="size-4" aria-hidden />
              {t("confirmAndContinue")}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="min-h-12 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-brand"
            >
              {t("continueWithoutPhotos")}
            </button>
            <span className="text-center text-[11px] text-muted sm:ml-auto sm:text-left">
              {t("draftSafeToLeave")}
            </span>
          </div>
        </section>

        {cameraOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-50 bg-black"
                role="dialog"
                aria-modal="true"
                aria-label={t("guidedCamera")}
              >
                <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-black text-white">
                  <div
                    className="absolute inset-x-0 top-0 z-20 flex items-start gap-3 bg-gradient-to-b from-black/75 via-black/35 to-transparent px-4 pb-8 pt-4"
                    style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{t("guidedCamera")}</p>
                      <p className="line-clamp-2 text-xs text-white/75">
                        {t("selectedTypeLine", {
                          label: t(`photoType_${selectedType.value}_label`),
                          hint: t(`photoType_${selectedType.value}_hint`),
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCameraOpen(false)}
                      className="ml-auto flex size-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur transition hover:bg-white/10"
                      aria-label={t("closeCamera")}
                    >
                      <X className="size-5" aria-hidden />
                    </button>
                  </div>

                  <div className="relative min-h-0 flex-1 bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />

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

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div
                        className={`border-2 border-dashed ${
                          photoType === "measurement"
                            ? "h-20 w-[min(78vw,22rem)] rounded-xl border-sky-300/80"
                            : photoType === "existing_plants"
                              ? "size-[min(54vw,13rem)] rounded-full border-lime-300/80"
                              : photoType === "problem_area"
                                ? "h-[min(44dvh,20rem)] w-[min(76vw,24rem)] rounded-[2rem] border-danger/85"
                                : "h-[min(46dvh,22rem)] w-[min(78vw,24rem)] rounded-[2rem] border-yellow-300/80"
                        }`}
                      />
                      <span className="mx-5 max-w-[21rem] rounded-full bg-black/65 px-4 py-2 text-center text-xs font-medium text-white/90 backdrop-blur-sm">
                        {t("frameLine", {
                          label: t(`photoType_${selectedType.value}_label`).toLowerCase(),
                          hint: t(`photoType_${selectedType.value}_hint`),
                        })}
                      </span>
                    </div>

                    <div
                      className="pointer-events-none absolute left-0 right-0 top-24 z-10 flex justify-center px-3"
                      aria-live="polite"
                    >
                      <span className="rounded-full border border-white/15 bg-black/70 px-4 py-1.5 text-center text-xs font-semibold text-white shadow-lg backdrop-blur-md">
                        {cameraTip}
                      </span>
                    </div>

                    <div className="pointer-events-none absolute bottom-36 left-3 right-3 grid grid-cols-3 gap-2 text-[11px] sm:bottom-40">
                      <LiveMetric
                        label={t("metricLight")}
                        ok={!liveSignal.tooDark && !liveSignal.tooBright}
                        t={t}
                      />
                      <LiveMetric label={t("metricDetail")} ok={!liveSignal.lowDetail} t={t} />
                      <LiveMetric label={t("metricLevel")} ok={!tilted} t={t} />
                    </div>

                    {(liveSignal.tooDark || liveSignal.tooBright || liveSignal.lowDetail) && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-danger/10">
                        <span className="rounded-full bg-danger px-3 py-1 text-xs font-bold uppercase tracking-wide text-on-strong">
                          {t("checkPhotoBeforeCapture")}
                        </span>
                      </div>
                    )}

                    {!cameraReady ? (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-black/70 text-white"
                        role={cameraError ? "alert" : undefined}
                      >
                        <div className="text-center">
                          <Loader2 className="mx-auto mb-2 size-6 animate-spin" aria-hidden />
                          <p className="text-sm font-semibold">
                            {cameraError ? t("cameraUnavailable") : t("openingCamera")}
                          </p>
                          {cameraError ? (
                            <p className="mt-1 max-w-xs text-xs text-white/75">{cameraError}</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div
                    className="absolute inset-x-0 bottom-0 z-20 flex flex-col gap-4 bg-gradient-to-t from-black via-black/82 to-transparent px-4 pb-4 pt-10"
                    style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                  >
                    <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                      {(
                        [
                          "front_yard",
                          "problem_area",
                          "existing_plants",
                          "soil_drainage",
                          "measurement",
                        ] as PhotoAssetType[]
                      ).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setPhotoType(type)}
                          className={`min-h-10 shrink-0 snap-start rounded-full border px-3 text-xs font-semibold backdrop-blur ${
                            photoType === type
                              ? "border-white bg-white text-black"
                              : "border-white/20 bg-white/10 text-white/78"
                          }`}
                        >
                          {t(`photoType_${type}_label`)}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="justify-self-start rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur"
                      >
                        {t("uploadShort")}
                      </button>
                      <button
                        type="button"
                        onClick={captureFromCamera}
                        disabled={!cameraReady || busy || captureBlocked}
                        className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-white/20 shadow-[0_0_0_6px_rgba(255,255,255,0.18)] backdrop-blur transition active:scale-95 disabled:opacity-45"
                        aria-label={
                          captureBlocked ? t("adjustShotToCapture") : t("captureGuidedPhoto")
                        }
                      >
                        <span className="size-14 rounded-full bg-white" />
                      </button>
                      <span className="justify-self-end text-right text-[11px] font-medium text-white/65">
                        {t("photoCount", { count: photos.length, max: MAX_PHOTOS })}
                      </span>
                    </div>
                    {captureBlocked ? (
                      <p className="text-center text-xs font-medium text-red-200">
                        {t("captureBlockedNote")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    </div>
  );
}

function ReadinessCheck({
  label,
  value,
  yes,
  no,
  t,
}: {
  label: string;
  value: boolean;
  yes: string;
  no: string;
  t: Translator;
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
      <p className="mt-1 text-xs text-muted">
        {value ? t("readinessYes", { text: yes }) : t("readinessNo", { text: no })}
      </p>
    </div>
  );
}

function LiveMetric({ label, ok, t }: { label: string; ok: boolean; t: Translator }) {
  return (
    <div
      className={`rounded-full border px-2 py-1 text-center font-semibold ${
        ok ? "border-white/20 bg-black/55 text-white" : "border-danger/40 bg-danger text-on-strong"
      }`}
    >
      {t("metricLabel", { label, state: ok ? t("metricOk") : t("metricFix") })}
    </div>
  );
}
