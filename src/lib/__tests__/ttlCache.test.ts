import { describe, expect, it } from "vitest";
import { TtlCache } from "@/lib/ttlCache";

describe("TtlCache", () => {
  it("returns undefined on miss and the value on hit", () => {
    const c = new TtlCache<string>(1000);
    expect(c.get("k", 0)).toBeUndefined();
    c.set("k", "v", 0);
    expect(c.get("k", 0)).toBe("v");
  });

  it("expires entries after the TTL", () => {
    const c = new TtlCache<number>(1000);
    c.set("k", 42, 0);
    expect(c.get("k", 999)).toBe(42);
    expect(c.get("k", 1000)).toBeUndefined();
  });

  it("evicts the oldest entry past maxEntries", () => {
    const c = new TtlCache<string>(10_000, 2);
    c.set("a", "1", 0);
    c.set("b", "2", 0);
    c.set("c", "3", 0); // should evict "a"
    expect(c.get("a", 0)).toBeUndefined();
    expect(c.get("b", 0)).toBe("2");
    expect(c.get("c", 0)).toBe("3");
  });
});
