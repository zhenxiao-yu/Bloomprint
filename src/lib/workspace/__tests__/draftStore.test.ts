// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  createPlanningDraft,
  loadPlanningDraft,
  savePlanningDraft,
  type PlanningDraftSnapshot,
} from "@/lib/workspace/draftStore";
import type { PhotoAsset } from "@/lib/workspace/types";

function draftWithPhoto(overrides: Partial<PhotoAsset> = {}): PlanningDraftSnapshot {
  const base = createPlanningDraft();
  const photo: PhotoAsset = {
    id: "photo-1",
    sessionId: base.session.id,
    type: "front_yard",
    localBlobId: `${base.session.id}:photo-1`,
    fileName: "yard.jpg",
    // ~2MB base64 stand-in: several of these would blow the localStorage quota.
    previewUrl: `data:image/jpeg;base64,${"A".repeat(2_000_000)}`,
    quality: "good",
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
  return { ...base, photos: [photo], analysis: null };
}

afterEach(() => {
  localStorage.clear();
});

describe("savePlanningDraft", () => {
  it("strips the heavy base64 preview from the localStorage snapshot but keeps metadata", () => {
    const draft = draftWithPhoto();
    const ok = savePlanningDraft(draft);

    expect(ok).toBe(true);
    const raw = localStorage.getItem(`bloomprint:v2:session:${draft.session.id}`);
    expect(raw).toBeTruthy();
    // The 2MB blob must not be persisted — that's what blows the quota.
    expect(raw).not.toContain("AAAA");
    expect(raw!.length).toBeLessThan(5_000);

    const reloaded = loadPlanningDraft(draft.session.id);
    expect(reloaded?.photos[0]?.previewUrl).toBe("");
    // Metadata survives so the photo can be rehydrated from IndexedDB by localBlobId.
    expect(reloaded?.photos[0]?.localBlobId).toBe(draft.photos[0].localBlobId);
    expect(reloaded?.photos[0]?.fileName).toBe("yard.jpg");
    expect(reloaded?.session.photoIds).toEqual(["photo-1"]);
  });

  it("keeps the preview for a photo that has no IndexedDB blob to rehydrate from", () => {
    const draft = draftWithPhoto({ localBlobId: "" });
    savePlanningDraft(draft);
    const reloaded = loadPlanningDraft(draft.session.id);
    expect(reloaded?.photos[0]?.previewUrl).toContain("data:image/jpeg");
  });

  it("reports failure (false) when localStorage rejects the write", () => {
    const draft = draftWithPhoto({ localBlobId: "" }); // keep the big preview to force a quota error
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
    try {
      expect(savePlanningDraft(draft)).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
