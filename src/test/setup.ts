// Shared Vitest setup. Wired via `test.setupFiles` in vitest.config.ts.
// Importing jest-dom matchers is harmless in the default node environment;
// the jsdom-only bits below are guarded so node tests are unaffected.
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// next-intl's navigation helpers import `next/navigation`, which does not
// resolve under Vitest's ESM loader (next 16 has no exports entry for it). Any
// component using `@/i18n/navigation` (e.g. its locale-aware <Link>) would fail
// to load. Stub the module with plain DOM equivalents so component tests run.
// Node-env tests that never import it are unaffected.
vi.mock("@/i18n/navigation", async () => {
  const { createElement } = await import("react");
  return {
    Link: ({ href, children, ...props }: { href: string; children?: unknown } & Record<string, unknown>) =>
      createElement("a", { href, ...props }, children as never),
    redirect: () => undefined,
    usePathname: () => "/",
    useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {}, refresh: () => {} }),
    getPathname: ({ href }: { href: string }) => href,
  };
});

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
