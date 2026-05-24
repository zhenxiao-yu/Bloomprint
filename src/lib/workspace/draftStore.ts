"use client";

import type {
  PhotoAnalysisResult,
  PhotoAsset,
  PhotoAssetType,
  PhotoQuality,
  PlanningSession,
  ProjectKind,
} from "@/lib/workspace/types";

const POINTER_KEY = "bloomprint:v2:active-session";
const SESSION_PREFIX = "bloomprint:v2:session:";
const DB_NAME = "bloomprint-workspace";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";

export interface PlanningDraftSnapshot {
  session: PlanningSession;
  photos: PhotoAsset[];
  analysis: PhotoAnalysisResult | null;
}

export interface DraftPhotoInput {
  type: PhotoAssetType;
  dataUrl: string;
  fileName?: string;
  sessionId: string;
  width?: number;
  height?: number;
  quality?: PhotoQuality;
  warnings?: string[];
  signature?: string;
}

function now() {
  return Date.now();
}

function createSession(projectKind: ProjectKind = "my_home"): PlanningSession {
  const timestamp = now();
  return {
    id: crypto.randomUUID(),
    workspaceId: "local-personal",
    projectKind,
    status: "draft",
    currentStep: "project",
    autosaveData: {},
    photoIds: [],
    lastSavedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createPlanningDraft(projectKind: ProjectKind = "my_home"): PlanningDraftSnapshot {
  return { session: createSession(projectKind), photos: [], analysis: null };
}

export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(POINTER_KEY);
  } catch {
    return null;
  }
}

export function clearActiveSession(): void {
  try {
    const id = localStorage.getItem(POINTER_KEY);
    if (id) localStorage.removeItem(SESSION_PREFIX + id);
    localStorage.removeItem(POINTER_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

export function savePlanningDraft(snapshot: PlanningDraftSnapshot): boolean {
  const updated = {
    ...snapshot,
    session: {
      ...snapshot.session,
      photoIds: snapshot.photos.map((p) => p.id),
      lastSavedAt: now(),
      updatedAt: now(),
    },
    // A base64 previewUrl can be megabytes per photo; persisting several into one
    // localStorage key reliably blows the ~5MB quota and the whole draft fails to
    // save. Keep only metadata here — the image bytes already live in IndexedDB
    // keyed by localBlobId (see saveDraftPhoto) and are restored by rehydrateDraftPhotos.
    photos: snapshot.photos.map((p) => (p.localBlobId ? { ...p, previewUrl: "" } : p)),
  };
  try {
    localStorage.setItem(POINTER_KEY, updated.session.id);
    localStorage.setItem(SESSION_PREFIX + updated.session.id, JSON.stringify(updated));
    return true;
  } catch {
    // Autosave is best effort; the caller surfaces an "unsaved" state on failure.
    return false;
  }
}

/**
 * Restore the base64 previews that savePlanningDraft strips out, reading the image
 * bytes back from IndexedDB. Call after loading a persisted draft before display.
 */
export async function rehydrateDraftPhotos(
  snapshot: PlanningDraftSnapshot,
): Promise<PlanningDraftSnapshot> {
  const photos = await Promise.all(
    snapshot.photos.map(async (photo) => {
      if (photo.previewUrl || !photo.localBlobId) return photo;
      const url = await getDraftPhotoUrl(photo.localBlobId);
      return url ? { ...photo, previewUrl: url } : photo;
    }),
  );
  return { ...snapshot, photos };
}

export function loadPlanningDraft(sessionId = getActiveSessionId()): PlanningDraftSnapshot | null {
  if (!sessionId) return null;
  try {
    const raw = localStorage.getItem(SESSION_PREFIX + sessionId);
    if (!raw) return null;
    const data = JSON.parse(raw) as PlanningDraftSnapshot;
    if (!data?.session?.id) return null;
    return data;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraftPhoto(input: DraftPhotoInput): Promise<PhotoAsset> {
  const photoId = crypto.randomUUID();
  const localBlobId = `${input.sessionId}:${photoId}`;
  const timestamp = now();
  const asset: PhotoAsset = {
    id: photoId,
    sessionId: input.sessionId,
    type: input.type,
    localBlobId,
    fileName: input.fileName,
    previewUrl: input.dataUrl,
    width: input.width,
    height: input.height,
    quality: input.quality,
    warnings: input.warnings,
    signature: input.signature,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      tx.objectStore(PHOTO_STORE).put(input.dataUrl, localBlobId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Keep previewUrl in memory/local draft if IndexedDB is unavailable.
  }
  return asset;
}

export async function getDraftPhotoUrl(localBlobId: string): Promise<string | null> {
  try {
    const db = await openDb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readonly");
      const req = tx.objectStore(PHOTO_STORE).get(localBlobId);
      req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  } catch {
    return null;
  }
}
