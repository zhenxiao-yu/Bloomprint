import type { ReactNode } from "react";

// A template re-mounts on every navigation (unlike layout), so this is where the
// route-change entrance animation lives. `.page-transition` is a no-op under
// prefers-reduced-motion (see globals.css), so it stays accessible.
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-transition flex flex-1 flex-col">{children}</div>;
}
