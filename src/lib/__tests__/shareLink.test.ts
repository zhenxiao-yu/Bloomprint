import { describe, expect, it } from "vitest";
import { buildShareUrl, decodeShare, encodeShare } from "@/lib/shareLink";
import { FIXTURES } from "@/domain";

describe("shareLink", () => {
  const payload = { intake: FIXTURES["oakville-front-yard"], adjustments: ["cheaper" as const] };

  it("round-trips intake + adjustments through encode/decode", () => {
    const decoded = decodeShare(encodeShare(payload));
    expect(decoded).not.toBeNull();
    expect(decoded?.intake).toEqual(payload.intake);
    expect(decoded?.adjustments).toEqual(payload.adjustments);
  });

  it("produces a URL-safe token (no +, /, or = padding)", () => {
    const token = encodeShare(payload);
    expect(token).not.toMatch(/[+/=]/);
  });

  it("builds an absolute share URL on the given origin", () => {
    const url = buildShareUrl("https://bloomprint.vercel.app", payload);
    expect(url.startsWith("https://bloomprint.vercel.app/plan?p=")).toBe(true);
  });

  it("returns null for malformed or empty input", () => {
    expect(decodeShare(null)).toBeNull();
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("not-valid-base64!!")).toBeNull();
  });

  it("rejects a well-formed token whose payload fails schema validation", () => {
    const bad = encodeShare({
      // @ts-expect-error intentionally invalid goal to test validation
      intake: { ...FIXTURES["oakville-front-yard"], goal: "nonsense-goal" },
      adjustments: [],
    });
    expect(decodeShare(bad)).toBeNull();
  });
});
