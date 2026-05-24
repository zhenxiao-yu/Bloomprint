"use client";

import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISSED_KEY = "bloomprint:pwa-install-dismissed";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaClient() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only register in production — a SW in dev caches localhost assets and causes
    // confusing stale-state during local development.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      });
    }

    const initialState = window.setTimeout(() => {
      setOffline(!navigator.onLine);
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "1" || isStandalone());
    }, 0);

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onInstall = (event: Event) => {
      event.preventDefault();
      if (!isStandalone()) setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.clearTimeout(initialState);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => undefined);
    setInstallPrompt(null);
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <>
      {offline ? (
        <div className="no-print border-b border-[var(--warn)]/25 bg-[var(--warn)]/10 px-4 py-2 text-center text-xs font-medium text-[var(--warn)]">
          <WifiOff className="mr-1 inline size-3.5" aria-hidden />
          Offline mode: drafts and saved plans remain available on this device.
        </div>
      ) : null}

      {installPrompt && !dismissed ? (
        <div className="no-print border-b border-border bg-surface px-4 py-2">
          <div className="mx-auto flex max-w-5xl items-center gap-2 text-xs text-muted">
            <Download className="size-4 text-brand" aria-hidden />
            <span className="min-w-0 flex-1">
              Install Bloomprint for a full-screen phone workspace with local draft recovery.
            </span>
            <button
              type="button"
              onClick={install}
              className="rounded-full bg-brand px-3 py-1.5 font-semibold text-on-strong"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-border p-1.5 text-muted"
              aria-label="Dismiss install prompt"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
