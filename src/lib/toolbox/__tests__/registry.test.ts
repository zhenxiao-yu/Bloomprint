import { describe, expect, it } from "vitest";

import { TOOL_CATALOG, TOOL_CATEGORIES, TOOL_PERSONAS } from "@/domain/toolbox/catalog";
import { TOOL_ICONS, getToolEntry } from "@/lib/toolbox/registry";
import en from "../../../../messages/en.json";
import zh from "../../../../messages/zh.json";

type Msgs = { Tools: Record<string, { title: string; intro: string }> };

describe("tool registry integrity", () => {
  it("every catalog slug has an icon + a registry entry", () => {
    for (const meta of TOOL_CATALOG) {
      expect(TOOL_ICONS[meta.slug], `icon for ${meta.slug}`).toBeDefined();
      expect(getToolEntry(meta.slug), `entry for ${meta.slug}`).toBeDefined();
    }
  });

  it("every catalog slug has Tools.<slug> title+intro in both locales", () => {
    const e = (en as unknown as Msgs).Tools;
    const z = (zh as unknown as Msgs).Tools;
    for (const meta of TOOL_CATALOG) {
      expect(e[meta.slug]?.title, `en title ${meta.slug}`).toBeTruthy();
      expect(e[meta.slug]?.intro, `en intro ${meta.slug}`).toBeTruthy();
      expect(z[meta.slug]?.title, `zh title ${meta.slug}`).toBeTruthy();
      expect(z[meta.slug]?.intro, `zh intro ${meta.slug}`).toBeTruthy();
    }
  });

  it("Tools key sets match between en and zh", () => {
    const ek = Object.keys((en as unknown as Msgs).Tools).sort();
    const zk = Object.keys((zh as unknown as Msgs).Tools).sort();
    expect(ek).toEqual(zk);
  });

  it("uses only known categories and personas; slugs are unique", () => {
    const slugs = new Set<string>();
    for (const meta of TOOL_CATALOG) {
      expect(TOOL_CATEGORIES).toContain(meta.category);
      for (const p of meta.personas) expect(TOOL_PERSONAS).toContain(p);
      expect(slugs.has(meta.slug), `duplicate ${meta.slug}`).toBe(false);
      slugs.add(meta.slug);
    }
  });
});
