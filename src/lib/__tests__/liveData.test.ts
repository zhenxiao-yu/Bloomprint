import { describe, expect, it } from "vitest";
import { getLiveDataGateway } from "@/lib/live-data";
import { getStoreSearchTemplates } from "@/lib/live-data/storeSearch";

describe("live data gateway", () => {
  it("defaults off and does not block store search templates", async () => {
    const old = process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA;
    process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA = "false";
    const gateway = getLiveDataGateway();
    await expect(gateway.weather("Toronto")).resolves.toBeNull();
    const store = await gateway.storeSearch("mulch");
    expect(store?.source.cacheStatus).toBe("fresh");
    expect(store?.value[0]?.url).toContain("homedepot");
    process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA = old;
  });

  it("labels store templates as search support, not inventory", async () => {
    const store = await getStoreSearchTemplates("boxwood");
    expect(store.source.supports.join(" ")).toMatch(/not inventory/i);
    expect(store.source.needsLocalVerification).toBe(true);
  });
});
