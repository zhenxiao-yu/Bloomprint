"use client";

import { useEffect, useState } from "react";

export interface NotificationPrefs {
  draftRecovery: boolean;
  careReminders: boolean;
  storePrep: boolean;
  quietHours: boolean;
  cadence: "smart" | "weekly" | "important";
}

const KEY = "bloomprint:v1:notification-prefs";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  draftRecovery: true,
  careReminders: true,
  storePrep: true,
  quietHours: true,
  cadence: "smart",
};

function readPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFS;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
}

function writePrefs(prefs: NotificationPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Device storage is best effort.
  }
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    const id = window.setTimeout(() => setPrefs(readPrefs()), 0);
    return () => window.clearTimeout(id);
  }, []);

  function update(next: Partial<NotificationPrefs>) {
    setPrefs((current) => {
      const merged = { ...current, ...next };
      writePrefs(merged);
      return merged;
    });
  }

  return { prefs, update };
}
