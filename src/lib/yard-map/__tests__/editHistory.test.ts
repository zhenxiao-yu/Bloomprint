import { describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  initHistory,
  pushHistory,
  redo,
  undo,
  type History,
} from "@/lib/yard-map/editHistory";

// The editor's real state is an array of zones; here we stand in for a zone
// with a tiny tagged object so referential identity is easy to reason about.
type Zone = { id: string };
const zones = (...ids: string[]): Zone[] => ids.map((id) => ({ id }));

describe("initHistory", () => {
  it("seeds the present with empty past and future", () => {
    const h = initHistory(zones("a"));
    expect(h.present).toEqual(zones("a"));
    expect(h.past).toEqual([]);
    expect(h.future).toEqual([]);
  });
});

describe("pushHistory", () => {
  it("commits a new present and pushes the old one onto past", () => {
    const first = zones("a");
    const second = zones("a", "b");
    const h = pushHistory(initHistory(first), second);
    expect(h.present).toBe(second);
    expect(h.past).toEqual([first]);
    expect(h.future).toEqual([]);
  });

  it("returns the same reference when next is referentially equal", () => {
    const present = zones("a");
    const h = initHistory(present);
    expect(pushHistory(h, present)).toBe(h);
  });

  it("clears the redo branch when committing after an undo", () => {
    const s0 = zones("0");
    const s1 = zones("1");
    const s2 = zones("2");
    let h = pushHistory(initHistory(s0), s1);
    h = pushHistory(h, s2);
    h = undo(h); // present back to s1, future = [s2]
    expect(h.future).toEqual([s2]);

    const branch = zones("branch");
    h = pushHistory(h, branch);
    expect(h.present).toBe(branch);
    expect(h.future).toEqual([]); // future discarded by the new commit
    expect(h.past).toEqual([s0, s1]);
  });

  it("caps past length to the limit, dropping the oldest entries", () => {
    let h: History<number> = initHistory(0);
    for (let i = 1; i <= 5; i++) {
      h = pushHistory(h, i, 3);
    }
    // present is 5; only the 3 most recent priors survive.
    expect(h.present).toBe(5);
    expect(h.past).toEqual([2, 3, 4]);
    expect(h.past).toHaveLength(3);
  });

  it("does not mutate the input history's arrays", () => {
    const h = initHistory(zones("a"));
    const pastBefore = h.past;
    pushHistory(h, zones("b"));
    expect(h.past).toBe(pastBefore);
    expect(h.past).toEqual([]);
  });
});

describe("undo", () => {
  it("restores the prior present and moves the old present to future", () => {
    const first = zones("a");
    const second = zones("a", "b");
    const pushed = pushHistory(initHistory(first), second);

    const undone = undo(pushed);
    expect(undone.present).toBe(first);
    expect(undone.past).toEqual([]);
    expect(undone.future).toEqual([second]);
  });

  it("is a no-op (same reference) when past is empty", () => {
    const h = initHistory(zones("a"));
    expect(undo(h)).toBe(h);
  });
});

describe("redo", () => {
  it("re-applies the next future present", () => {
    const first = zones("a");
    const second = zones("a", "b");
    const undone = undo(pushHistory(initHistory(first), second));

    const redone = redo(undone);
    expect(redone.present).toBe(second);
    expect(redone.past).toEqual([first]);
    expect(redone.future).toEqual([]);
  });

  it("round-trips: push → undo → redo lands back on the committed present", () => {
    const first = zones("a");
    const second = zones("a", "b");
    const pushed = pushHistory(initHistory(first), second);
    expect(redo(undo(pushed))).toEqual(pushed);
  });

  it("is a no-op (same reference) when future is empty", () => {
    const h = pushHistory(initHistory(zones("a")), zones("b"));
    expect(redo(h)).toBe(h);
  });
});

describe("canUndo / canRedo", () => {
  it("reports false at both boundaries on a fresh history", () => {
    const h = initHistory(zones("a"));
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });

  it("reports true for undo after a commit, and true for redo after an undo", () => {
    const pushed = pushHistory(initHistory(zones("a")), zones("b"));
    expect(canUndo(pushed)).toBe(true);
    expect(canRedo(pushed)).toBe(false);

    const undone = undo(pushed);
    expect(canUndo(undone)).toBe(false);
    expect(canRedo(undone)).toBe(true);
  });
});
