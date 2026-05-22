"use client";

import { useEffect } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export function PrintBar({ backHref }: { backHref: string }) {
  useEffect(() => {
    trackEvent("store_opened");
  }, []);

  return (
    <div className="no-print mb-6 flex items-center justify-between gap-3">
      <Link href={backHref} className="text-sm font-semibold text-brand">
        ← Back to plan
      </Link>
      <button
        onClick={() => window.print()}
        className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
      >
        Print / Save PDF
      </button>
    </div>
  );
}
