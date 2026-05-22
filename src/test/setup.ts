// Shared Vitest setup. Wired via `test.setupFiles` in vitest.config.ts.
// Importing jest-dom matchers is harmless in the default node environment;
// the jsdom-only bits below are guarded so node tests are unaffected.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

// jsdom does not implement IntersectionObserver (used by PlanResult's
// scroll-spy) or matchMedia (used by next-themes). Provide minimal stubs
// only when running in a DOM environment.
if (typeof window !== "undefined") {
  const w = window as unknown as { IntersectionObserver?: unknown };
  if (!w.IntersectionObserver) {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    w.IntersectionObserver = IO;
    (globalThis as unknown as { IntersectionObserver?: unknown }).IntersectionObserver = IO;
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() {
          return false;
        },
      }) as MediaQueryList;
  }
}
