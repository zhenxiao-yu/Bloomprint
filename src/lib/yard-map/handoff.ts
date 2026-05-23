/**
 * One-shot handoff of the uploaded yard photo from the plan flow to the Yard
 * Map builder. The photo is a (potentially large) data URL, so it can't ride
 * the URL — we stash it in sessionStorage for the very next navigation and read
 * it once. The short `goal` travels as a normal query param instead.
 *
 * All access is guarded for SSR (no window on the server).
 */
const PHOTO_KEY = "bloomprint:yard-photo";

export function stashYardPhoto(photoUrl: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (photoUrl) window.sessionStorage.setItem(PHOTO_KEY, photoUrl);
    else window.sessionStorage.removeItem(PHOTO_KEY);
  } catch {
    /* storage unavailable (private mode / quota) — the map just opens blank */
  }
}

/** Read and clear the stashed photo (consume-once). Returns null if none. */
export function takeYardPhoto(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(PHOTO_KEY);
    if (v) window.sessionStorage.removeItem(PHOTO_KEY);
    return v;
  } catch {
    return null;
  }
}
