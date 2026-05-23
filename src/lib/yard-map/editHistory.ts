/**
 * A tiny generic immutable undo/redo history stack.
 *
 * The Yard Map editor's state is an array of zones, but nothing here knows
 * that: the stack is fully generic over a present value `T` and never inspects
 * it. Every operation returns a new `History<T>` (or the same reference when
 * there is nothing to do) and never mutates the input arrays, so it is safe to
 * drive from React state and to unit-test in plain Vitest with no DOM/konva
 * dependency.
 */

/** A point-in-time snapshot of an editor's undo/redo stacks. */
export interface History<T> {
  /** Prior presents, oldest first; the last entry is the most recent undo target. */
  readonly past: T[];
  /** The current value. */
  readonly present: T;
  /** Undone presents, next-to-redo first. */
  readonly future: T[];
}

/** The default cap on how many `past` entries are retained. */
const DEFAULT_LIMIT = 50;

/** Create a fresh history seeded with `present` and empty past/future. */
export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

/**
 * Commit a new present. Pushes the old present onto `past`, clears `future`
 * (committing always abandons the redo branch), and caps `past` length to
 * `limit` by dropping the oldest entries. Default limit is 50.
 *
 * If `next` is referentially equal to the current present, the history is
 * returned unchanged (same reference) so callers can skip no-op commits.
 */
export function pushHistory<T>(
  history: History<T>,
  next: T,
  limit: number = DEFAULT_LIMIT,
): History<T> {
  if (next === history.present) return history;
  const past = [...history.past, history.present];
  // Drop oldest entries when the cap is exceeded (limit < 1 keeps none).
  const capped = limit > 0 ? past.slice(Math.max(0, past.length - limit)) : [];
  return { past: capped, present: next, future: [] };
}

/**
 * Move one step back: the last `past` entry becomes the present and the old
 * present moves to the front of `future`. No-op (returns the same reference)
 * when `past` is empty.
 */
export function undo<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history;
  const past = history.past.slice(0, -1);
  const present = history.past[history.past.length - 1];
  return { past, present, future: [history.present, ...history.future] };
}

/**
 * Move one step forward: the first `future` entry becomes the present and the
 * old present is appended to `past`. No-op (returns the same reference) when
 * `future` is empty.
 */
export function redo<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history;
  const [present, ...future] = history.future;
  return { past: [...history.past, history.present], present, future };
}

/** Whether there is a prior present to step back to. */
export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

/** Whether there is an undone present to step forward to. */
export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}
