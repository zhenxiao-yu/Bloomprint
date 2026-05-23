import { describe, expect, it, beforeEach } from "vitest";
import { rateLimit, clientIp, __resetRateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimit());

  it("allows up to the limit, then blocks with a retry-after", () => {
    const t0 = 1_000_000;
    expect(rateLimit("a", 3, 60_000, t0).ok).toBe(true);
    expect(rateLimit("a", 3, 60_000, t0).ok).toBe(true);
    const third = rateLimit("a", 3, 60_000, t0);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
    const blocked = rateLimit("a", 3, 60_000, t0 + 1000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const t0 = 5_000_000;
    rateLimit("b", 1, 10_000, t0);
    expect(rateLimit("b", 1, 10_000, t0 + 5_000).ok).toBe(false);
    expect(rateLimit("b", 1, 10_000, t0 + 10_001).ok).toBe(true);
  });

  it("keys are independent", () => {
    const t0 = 9_000_000;
    rateLimit("x", 1, 60_000, t0);
    expect(rateLimit("y", 1, 60_000, t0).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first x-forwarded-for entry", () => {
    const req = new Request("https://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then local", () => {
    expect(clientIp(new Request("https://x", { headers: { "x-real-ip": "9.9.9.9" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("https://x"))).toBe("local");
  });
});
