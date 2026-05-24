import { describe, expect, it } from "vitest";
import {
  consolidateShoppingItems,
  groupByStatus,
  proStats,
  type ProProject,
} from "@/lib/pro/proStore";
import type { ShoppingItem } from "@/domain/models";

const DAY = 24 * 60 * 60 * 1000;

function project(over: Partial<ProProject>): ProProject {
  return {
    id: crypto.randomUUID(),
    title: "Project",
    status: "lead",
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

function item(over: Partial<ShoppingItem>): ShoppingItem {
  return {
    name: "Cedar mulch",
    category: "mulch",
    quantity: 1,
    unit: "bag",
    price: { min: 5, max: 8 },
    priority: "buy-first",
    ...over,
  };
}

describe("proStats", () => {
  const now = 1_000_000_000_000;
  const projects: ProProject[] = [
    project({ status: "lead" }),
    project({ status: "quoted", priceQuoted: 2000 }),
    project({ status: "scheduled", scheduledFor: now + 2 * DAY, priceQuoted: 1500 }),
    project({ status: "scheduled", scheduledFor: now + 30 * DAY }),
    project({ status: "done", priceQuoted: 999 }),
  ];

  it("counts active, awaiting approval, and near-term scheduled", () => {
    const s = proStats(projects, now);
    expect(s.active).toBe(4); // everything except done
    expect(s.awaitingApproval).toBe(1);
    expect(s.scheduledSoon).toBe(1); // only the one within 7 days
  });

  it("sums pipeline value of non-done projects only", () => {
    expect(proStats(projects, now).pipelineValue).toBe(3500); // 2000 + 1500, not the done 999
  });
});

describe("groupByStatus", () => {
  it("buckets every project under its status with all columns present", () => {
    const groups = groupByStatus([project({ status: "lead" }), project({ status: "done" })]);
    expect(groups.lead).toHaveLength(1);
    expect(groups.done).toHaveLength(1);
    expect(groups.in_progress).toEqual([]);
  });
});

describe("consolidateShoppingItems", () => {
  it("merges the same item across projects, summing quantity, price, and project count", () => {
    const result = consolidateShoppingItems([
      { projectId: "a", items: [item({ quantity: 3, price: { min: 15, max: 24 } })] },
      { projectId: "b", items: [item({ quantity: 2, price: { min: 10, max: 16 } })] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ quantity: 5, priceMin: 25, priceMax: 40, projectCount: 2 });
  });

  it("keeps distinct items separate and orders buy-first ahead of optional", () => {
    const result = consolidateShoppingItems([
      {
        projectId: "a",
        items: [
          item({ name: "Solar light", category: "lighting", priority: "optional" }),
          item({ name: "Cedar mulch", priority: "buy-first" }),
        ],
      },
    ]);
    expect(result.map((r) => r.name)).toEqual(["Cedar mulch", "Solar light"]);
  });
});
