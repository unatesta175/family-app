/**
 * Running timers for "timer" habits. A running timer is just a start timestamp, kept in
 * localStorage (so it survives reloads and keeps counting while the page is closed) with an
 * in-memory fallback for browsers where storage is blocked. Client-side only.
 */

const EVENT = "habit-timer-change";
const memory = new Map<string, string>();

const keyFor = (habitId: number, date: string) => `habit-timer:${habitId}:${date}`;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* storage blocked — fall back to memory below */
  }
  if (value === null) memory.delete(key);
  else memory.set(key, value);
  window.dispatchEvent(new Event(EVENT));
}

/** When the habit's timer was started (ms since epoch), or null if it isn't running. */
export function readTimerStart(habitId: number, date: string): number | null {
  const raw = read(keyFor(habitId, date));
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function startTimer(habitId: number, date: string) {
  write(keyFor(habitId, date), String(Date.now()));
}

/** Stops the timer and returns the whole seconds it ran for (0 if it wasn't running). */
export function stopTimer(habitId: number, date: string): number {
  const startedAt = readTimerStart(habitId, date);
  write(keyFor(habitId, date), null);
  return startedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

export function subscribeTimers(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
