import { STORAGE_KEY } from "@/lib/preferencesStore";

/**
 * Pre-paint script that mirrors the user's device preferences onto <html>
 * data-* attributes BEFORE React hydrates — the same trick next-themes uses to
 * avoid a flash of the wrong font size / contrast. Runs synchronously in <body>.
 */
export function PreferencesScript() {
  const js = `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
    STORAGE_KEY,
  )})||"{}");var e=document.documentElement;e.dataset.fontScale="default";e.dataset.reduceMotion=String(!!p.reduceMotion);e.dataset.contrast=p.highContrast?"high":"normal";e.dataset.tap=p.largeTapTargets?"large":"normal";}catch(_){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} suppressHydrationWarning />;
}
