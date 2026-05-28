/**
 * USDA hardiness-zone lookup by US ZIP. Server-side proxy to phzmapi.org (keyless, USDA 2023
 * data) — keeps the call CORS-safe, validated, rate-limited, and transient (never stored). The
 * tool degrades to manual zone entry when this is unavailable.
 */
import { NextResponse } from "next/server";

import { isValidUsZip, parseHardiness } from "@/domain/toolbox/hardiness";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(request: Request) {
  const zip = (new URL(request.url).searchParams.get("zip") ?? "").trim();
  if (!isValidUsZip(zip)) {
    return NextResponse.json({ error: "invalid_zip" }, { status: 400 });
  }

  const rl = rateLimit(`${clientIp(request)}:hardiness`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSec) } },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`https://phzmapi.org/${zip}.json`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const data = parseHardiness(await res.json());
    if (!data) {
      return NextResponse.json({ error: "bad_response" }, { status: 502 });
    }
    return NextResponse.json({
      ...data,
      source: "phzmapi.org · USDA 2023 Plant Hardiness Zone Map",
      fetchedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "unreachable" }, { status: 503 });
  } finally {
    clearTimeout(timeout);
  }
}
