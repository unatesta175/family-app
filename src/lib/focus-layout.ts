import type { SessionLite } from "@/lib/focus";

/** More than this are not drawn one by one (a year can hold thousands). */
export const MAX_TREES = 320;

/** A stable pseudo-random number from two small integers, so the layout never jumps between renders. */
export const hash = (a: number, b: number) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 9973;

export type Placed = { s: SessionLite; i: number; j: number };

/**
 * Where each tree stands in the garden: a square grid a little bigger than the number of trees, each
 * tree on a tile picked in a fixed scattered order. Both the 2.5D and the 3D garden use it, so they
 * show the same garden.
 */
export function layoutGarden(sessions: SessionLite[], minSize = 5): { n: number; placed: Placed[]; hidden: number } {
  const all = sessions.filter((s) => s.status !== "active");
  const shown = all.slice(-MAX_TREES);
  const n = Math.max(minSize, Math.ceil(Math.sqrt(shown.length * 1.9)) + 1);
  const cells: { i: number; j: number; h: number }[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push({ i, j, h: hash(i + 1, j + 1) });
  cells.sort((a, b) => a.h - b.h);
  const placed = shown.map((s, k) => ({ s, i: cells[k].i, j: cells[k].j })).sort((a, b) => a.i + a.j - (b.i + b.j));
  return { n, placed, hidden: all.length - shown.length };
}
