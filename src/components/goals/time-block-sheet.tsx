"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addBlockAction, deleteBlockAction, updateBlockAction } from "@/lib/time-actions";
import {
  CATEGORY_BY_KEY,
  TIME_CATEGORIES,
  blockMinutes,
  formatDuration,
  parseClock,
  toClock,
  toClock12,
  type Block,
  type TimeCategory,
} from "@/lib/time-planner";
import { Sheet } from "@/components/habits/sheet";
import { Caption } from "@/components/habits/form-fields";
import { HabitIcon } from "@/components/habits/habit-icon";
import { inputClass } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

const FREE_IDEAS = ["Reading", "Gaming", "Social media", "TV / videos", "Hobby", "Walk", "Friends", "Rest"];

/** Add or edit one activity in a routine: what, and from what time to what time. */
export function TimeBlockSheet({
  routineId,
  routineName,
  block,
  gaps,
  initial,
  onClose,
}: {
  routineId: number;
  routineName: string;
  /** The activity being edited, or null to add a new one. */
  block: Block | null;
  /** Free windows (minutes) offered as one-tap fills. */
  gaps: { start: number; end: number }[];
  /** Prefill for a new activity. */
  initial?: { category?: TimeCategory; start?: number; end?: number };
  onClose: () => void;
}) {
  const [category, setCategory] = useState<TimeCategory>(block?.category ?? initial?.category ?? "work");
  const [label, setLabel] = useState(block?.label ?? "");
  const [start, setStart] = useState(toClock(block?.start ?? initial?.start ?? 9 * 60));
  const [end, setEnd] = useState(toClock(block?.end ?? initial?.end ?? 10 * 60));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const s = parseClock(start);
  const e = parseClock(end);
  const valid = s !== null && e !== null && s < 1440 && s !== e % 1440;
  // An end of 00:00 means midnight (end of the day); anything at or before the start runs past midnight.
  const endMin = e === null ? null : e === 0 ? 1440 : e;
  const minutes = valid && s !== null && endMin !== null ? blockMinutes({ start: s, end: endMin }) : null;
  const meta = CATEGORY_BY_KEY[category];

  function save() {
    setError(null);
    if (!valid || s === null || endMin === null) return setError("Enter a start and an end time.");
    const input = { routineId, startMin: s, endMin, category, label: label.trim() || null };
    startTransition(async () => {
      const res = block ? await updateBlockAction(block.id, input) : await addBlockAction(input);
      if (!res.ok) return setError(res.error);
      onClose();
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={block ? "Edit activity" : "Add activity"}
      className="sm:max-w-lg"
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          <div className="flex gap-2">
            {block && (
              <button
                type="button"
                aria-label="Delete activity"
                onClick={() =>
                  startTransition(async () => {
                    await deleteBlockAction(block.id);
                    onClose();
                  })
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-h-border text-h-bad hover:bg-h-bad/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={pending}
              style={{ background: meta.color }}
              className="flex-1 rounded-xl py-3 text-sm font-extrabold text-white shadow-sm disabled:opacity-60"
            >
              {pending ? "Saving…" : block ? "Save changes" : "Add to " + routineName}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-2 pt-1">
        <div>
          <Caption>What is it?</Caption>
          <div role="radiogroup" aria-label="Category" className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {TIME_CATEGORIES.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategory(c.key)}
                  style={active ? { borderColor: c.color, background: `${c.color}1a` } : undefined}
                  className={cn("flex items-center gap-2 rounded-xl border-2 px-2.5 py-2 text-left transition-colors", active ? "" : "border-h-border bg-h-surface hover:bg-h-surface2")}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: `${c.color}26`, color: c.color }}>
                    <HabitIcon name={c.icon} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-xs font-bold leading-tight">{c.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[11px] text-h-muted">{meta.hint}</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <Caption>{category === "free" ? "What do you do with this free time?" : "Details (optional)"}</Caption>
          <input
            value={label}
            onChange={(ev) => setLabel(ev.target.value)}
            maxLength={40}
            placeholder={category === "free" ? "e.g. Reading, Gaming" : category === "pray" ? "e.g. Fajr, Isha" : category === "chores" ? "e.g. Wash and fold clothes" : "e.g. " + meta.label}
            className={inputClass}
          />
          {category === "free" && (
            <div className="flex flex-wrap gap-1.5">
              {FREE_IDEAS.map((idea) => (
                <button key={idea} type="button" onClick={() => setLabel(idea)} className="rounded-full border border-h-border bg-h-surface px-2.5 py-1 text-[11px] font-bold text-h-muted hover:text-h-fg">
                  {idea}
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1.5">
            <Caption>From</Caption>
            <input type="time" value={start} onChange={(ev) => setStart(ev.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <Caption>To</Caption>
            <input type="time" value={end} onChange={(ev) => setEnd(ev.target.value)} className={inputClass} />
          </label>
        </div>
        <p className="-mt-2 text-[11px] leading-snug text-h-muted">
          {minutes !== null && s !== null && endMin !== null
            ? `${toClock12(s)} to ${toClock12(endMin % 1440)} · ${formatDuration(minutes)}${endMin <= s ? " (runs past midnight)" : ""}`
            : "Pick the time it starts and ends. Use an earlier end time for something that runs past midnight, like sleep."}
        </p>

        {gaps.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Caption>Free windows</Caption>
            <div className="flex flex-wrap gap-1.5">
              {gaps.map((g) => (
                <button
                  key={`${g.start}-${g.end}`}
                  type="button"
                  onClick={() => {
                    setStart(toClock(g.start));
                    setEnd(toClock(g.end));
                  }}
                  className="rounded-lg border border-dashed border-h-border px-2.5 py-1 text-[11px] font-bold text-h-muted hover:border-h-brand hover:text-h-brand"
                >
                  {toClock12(g.start)} – {toClock12(g.end % 1440)} · {formatDuration(g.end - g.start)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
