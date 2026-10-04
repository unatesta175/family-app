"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addNoteAction, deleteNoteAction } from "@/lib/goal-actions";
import { inputClass } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

export type JournalEntry = { id: number; body: string; mood: number | null; createdAt: string; who: string; mine: boolean };

const MOODS = [
  { value: 1, emoji: "😞", label: "Rough" },
  { value: 2, emoji: "🙁", label: "Low" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
] as const;

const moodEmoji = (m: number | null) => MOODS.find((x) => x.value === m)?.emoji ?? "";

/** Reflection journal: short notes about how the goal is going, with an optional mood. */
export function GoalJournal({ goalId, entries, canWrite, isOwner }: { goalId: number; entries: JournalEntry[]; canWrite: boolean; isOwner: boolean }) {
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await addNoteAction({ goalId, body, mood });
      if (!res.ok) return setError(res.error);
      setBody("");
      setMood(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <div className="flex flex-col gap-2 rounded-xl bg-h-surface2 p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="How is it going? What did you learn, what got in the way?"
            className={cn(inputClass, "resize-none")}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1" role="radiogroup" aria-label="Mood">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mood === m.value}
                  title={m.label}
                  onClick={() => setMood(mood === m.value ? null : m.value)}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all", mood === m.value ? "bg-h-surface shadow-sm ring-2 ring-h-brand" : "opacity-60 hover:opacity-100")}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
            <button type="button" onClick={add} disabled={pending || !body.trim()} className="rounded-xl bg-h-brand px-4 py-2 text-sm font-bold text-h-brand-fg disabled:opacity-40">
              Add note
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}

      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-h-muted">No notes yet. Reflecting for a minute now and then keeps goals alive.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((n) => (
            <li key={n.id} className="h-card p-3.5">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">{moodEmoji(n.mood) || "📝"}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{n.body}</p>
                  <p className="mt-1.5 text-[11px] font-semibold text-h-muted">
                    {new Date(n.createdAt.replace(" ", "T") + "Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {!n.mine && ` · ${n.who}`}
                  </p>
                </div>
                {(n.mine || isOwner) && (
                  <button
                    type="button"
                    aria-label="Delete note"
                    onClick={() => startTransition(() => deleteNoteAction(n.id))}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
