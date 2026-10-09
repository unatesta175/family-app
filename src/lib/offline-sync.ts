/**
 * The pure core of offline-first sync: an offline queue of edits made while disconnected, and the
 * last-write-wins rules that decide, when the device reconnects, whose value survives. No DB, no
 * service worker, no browser APIs — just the decision logic — so it is fully unit-testable here while
 * the (browser-dependent) wiring that captures edits and replays them lands separately.
 *
 * The first target is prayer check-ins: each edit sets or clears one prayer on one day for one profile.
 * A "key" identifies that cell; values are the chosen status (or null to clear). Every edit carries the
 * client wall-clock time it happened, which is what last-write-wins compares.
 */

export type QueuedOp = {
  /** Client-generated unique id, so replaying the same op twice is a no-op (idempotency). */
  opId: string;
  /** The cell this edit targets — see `targetKey`. */
  key: string;
  /** The new prayer status, or null to clear the log. */
  value: string | null;
  /** Client wall-clock (epoch ms) when the user made the edit. The basis for last-write-wins. */
  ts: number;
};

/** A value as the server currently holds it, with the time it was last written. */
export type ServerEntry = { value: string | null; ts: number };

/** The stable key for a prayer cell: profile + day + prayer. */
export function targetKey(profileId: number, date: string, prayer: string): string {
  return `${profileId}:${date}:${prayer}`;
}

/**
 * Collapses a queue so each cell keeps only its latest edit (by timestamp; ties broken by queue order,
 * later wins). Editing Fajr three times offline therefore replays as a single write, and superseded
 * edits are dropped. The result is ordered oldest-to-newest by timestamp for a deterministic replay.
 */
export function coalesce(ops: QueuedOp[]): QueuedOp[] {
  const latest = new Map<string, QueuedOp>();
  for (const op of ops) {
    const prev = latest.get(op.key);
    if (!prev || op.ts >= prev.ts) latest.set(op.key, op);
  }
  return [...latest.values()].sort((a, b) => a.ts - b.ts || (a.opId < b.opId ? -1 : 1));
}

/**
 * Last-write-wins between a local edit and the server's value: the newer timestamp wins. A tie goes to
 * the server, which is the single source of truth (so reconnecting never "wins" by accident on equal
 * times). Returns the surviving entry and which side it came from.
 */
export function resolve(local: ServerEntry, remote: ServerEntry): { winner: ServerEntry; source: "local" | "remote" } {
  return local.ts > remote.ts ? { winner: local, source: "local" } : { winner: remote, source: "remote" };
}

export type SyncPlan = {
  /** Ops to push to the server (they are newer than what the server holds). */
  apply: QueuedOp[];
  /** Ops dropped because the server already has a newer value for that cell (stale offline edit). */
  skip: QueuedOp[];
};

/**
 * Given the queued offline edits and the server's current state, decides what to push on reconnect.
 * An edit is pushed only if it is strictly newer than the server's value for that cell; otherwise the
 * server changed more recently (e.g. on another device) and the stale edit is skipped rather than
 * clobbering it. The queue is coalesced first, so at most one op per cell is ever pushed.
 */
export function planSync(ops: QueuedOp[], server: Record<string, ServerEntry>): SyncPlan {
  const apply: QueuedOp[] = [];
  const skip: QueuedOp[] = [];
  for (const op of coalesce(ops)) {
    const remote = server[op.key];
    if (!remote || op.ts > remote.ts) apply.push(op);
    else skip.push(op);
  }
  return { apply, skip };
}

/**
 * Applies the queued edits onto a local view for an immediate, optimistic UI while offline. Clearing
 * (value null) removes the cell. Deterministic: coalesced and applied oldest-first.
 */
export function applyToView(view: Record<string, string | null>, ops: QueuedOp[]): Record<string, string | null> {
  const next = { ...view };
  for (const op of coalesce(ops)) {
    if (op.value === null) delete next[op.key];
    else next[op.key] = op.value;
  }
  return next;
}

/** Removes ops that have been confirmed applied by the server, by opId (what a successful replay returns). */
export function acknowledge(ops: QueuedOp[], appliedOpIds: Iterable<string>): QueuedOp[] {
  const done = new Set(appliedOpIds);
  return ops.filter((op) => !done.has(op.opId));
}
