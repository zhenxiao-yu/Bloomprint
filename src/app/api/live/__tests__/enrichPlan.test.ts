import { beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/live/enrich-plan/route";
import { LivePlanEnrichment } from "@/lib/live-data/schema";
import { __resetRateLimit } from "@/lib/rateLimit";

function post(body: unknown, ip = "test-1"): Request {
  return new Request("http://localhost/api/live/enrich-plan", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/live/enrich-plan", () => {
  beforeEach(() => __resetRateLimit());

  it("GET reports whether real providers are configured", async () => {
    const res = await GET();
    const json = (await res.json()) as { enabled: boolean };
    expect(typeof json.enabled).toBe("boolean");
  });

  it("returns a schema-valid enrichment for a valid summary", async () => {
    const res = await POST(
      post({
        region: "Oakville, ON",
        items: [{ id: "Mulch", name: "Mulch", category: "mulch", price: { min: 5, max: 9 } }],
        plants: [{ plantId: "emerald-cedar", commonName: "Emerald Cedar" }],
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(() => LivePlanEnrichment.parse(json)).not.toThrow();
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await POST(post("{not json", "test-2"));
    expect(res.status).toBe(400);
  });

  it("rejects a malformed body with 400", async () => {
    const res = await POST(post({ items: "nope" }, "test-3"));
    expect(res.status).toBe(400);
  });
});
