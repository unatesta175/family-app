/* Sanity checks for the offline-sync core (queue coalescing + last-write-wins). This is the logic that
 * decides whose edit survives on reconnect, so a bug here means silent data loss — exactly what must
 * never regress. Run: npx tsx scripts/offline-sync-check.ts */
import { acknowledge, applyToView, coalesce, planSync, resolve, targetKey, type QueuedOp, type ServerEntry } from "../src/lib/offline-sync";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
}

const K = targetKey(7, "2026-10-09", "fajr");
const K2 = targetKey(7, "2026-10-09", "dhuhr");
const op = (opId: string, key: string, value: string | null, ts: number): QueuedOp => ({ opId, key, value, ts });

// --- targetKey -----------------------------------------------------------------------------
eq("targetKey is profile:date:prayer", targetKey(7, "2026-10-09", "fajr"), "7:2026-10-09:fajr");

// --- coalesce ------------------------------------------------------------------------------
eq("coalesce keeps only the latest edit per cell", coalesce([op("a", K, "on_time", 100), op("b", K, "late", 200)]).map((o) => o.opId), ["b"]);
eq("coalesce keeps distinct cells", coalesce([op("a", K, "on_time", 100), op("b", K2, "jamaah", 150)]).length, 2);
eq("coalesce orders oldest-to-newest", coalesce([op("b", K2, "jamaah", 150), op("a", K, "on_time", 100)]).map((o) => o.opId), ["a", "b"]);

// --- resolve (last-write-wins) -------------------------------------------------------------
const local: ServerEntry = { value: "on_time", ts: 200 };
const remote: ServerEntry = { value: "missed", ts: 100 };
eq("newer local wins", resolve(local, remote).source, "local");
eq("newer remote wins", resolve({ value: "on_time", ts: 100 }, { value: "missed", ts: 200 }).source, "remote");
eq("a tie goes to the server (source of truth)", resolve({ value: "a", ts: 100 }, { value: "b", ts: 100 }).source, "remote");

// --- planSync ------------------------------------------------------------------------------
eq("a newer-than-server edit is pushed", planSync([op("a", K, "on_time", 500)], { [K]: { value: "missed", ts: 100 } }).apply.map((o) => o.opId), ["a"]);
eq("a stale edit (older than server) is skipped, not clobbering the server", planSync([op("a", K, "on_time", 100)], { [K]: { value: "jamaah", ts: 500 } }).skip.map((o) => o.opId), ["a"]);
eq("an edit for an untouched cell is pushed", planSync([op("a", K, "on_time", 100)], {}).apply.length, 1);
eq("planSync coalesces before planning (one push per cell)", planSync([op("a", K, "on_time", 100), op("b", K, "late", 200)], {}).apply.map((o) => o.opId), ["b"]);

// --- applyToView (optimistic) --------------------------------------------------------------
eq("applyToView sets a value", applyToView({}, [op("a", K, "on_time", 100)]), { [K]: "on_time" });
eq("applyToView clears a value with null", applyToView({ [K]: "on_time" }, [op("a", K, null, 100)]), {});
eq("applyToView applies latest when several edits stack", applyToView({}, [op("a", K, "on_time", 100), op("b", K, "late", 200)]), { [K]: "late" });

// --- acknowledge ---------------------------------------------------------------------------
eq("acknowledge drops confirmed ops by id", acknowledge([op("a", K, "on_time", 100), op("b", K2, "late", 200)], ["a"]).map((o) => o.opId), ["b"]);
eq("acknowledging an unknown id leaves the queue intact", acknowledge([op("a", K, "on_time", 100)], ["zzz"]).length, 1);

console.log(failed === 0 ? "\nAll checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
