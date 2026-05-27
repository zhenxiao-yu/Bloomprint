"use client";

/**
 * Helpers for the Data & privacy settings section. Bloomprint stores everything
 * on-device under the `bloomprint:` localStorage namespace, so "export" and
 * "clear all" are honest, local operations — no server round-trip.
 */

const PREFIX = "bloomprint:";

function localKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(PREFIX)) keys.push(key);
  }
  return keys;
}

/** Approximate on-device footprint in bytes (UTF-16 chars ≈ 2 bytes each). */
export function localDataSizeBytes(): number {
  if (typeof window === "undefined") return 0;
  let bytes = 0;
  for (const key of localKeys()) {
    const value = window.localStorage.getItem(key) ?? "";
    bytes += (key.length + value.length) * 2;
  }
  return bytes;
}

/** Build a portable JSON snapshot of everything Bloomprint keeps on this device. */
export function buildDataExport(): string {
  const data: Record<string, unknown> = {};
  for (const key of localKeys()) {
    const raw = window.localStorage.getItem(key);
    if (raw === null) continue;
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), source: "Bloomprint", data },
    null,
    2,
  );
}

/** Trigger a client-side download of the data export. */
export function downloadDataExport() {
  if (typeof window === "undefined") return;
  const blob = new Blob([buildDataExport()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bloomprint-data-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Remove every Bloomprint key from this device. Caller should reload after. */
export function clearAllLocalData() {
  if (typeof window === "undefined") return;
  for (const key of localKeys()) {
    window.localStorage.removeItem(key);
  }
}
