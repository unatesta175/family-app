"use client";

import { useState, useTransition } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Sheet } from "@/components/habits/sheet";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { deleteFocusSessionAction, editFocusSessionTimeAction } from "@/lib/focus-actions";
import { formatFocus } from "@/lib/focus";

type Props = {
  id: number;
  status: "active" | "completed" | "withered";
  startedAt: number;
  endedAt: number | null;
  seconds: number;
};

/** Per-row "..." menu on a finished session: edit its recorded time or delete it entirely. */
export function SessionRowActions({ id, status, startedAt, endedAt, seconds }: Props) {
  const [open, setOpen] = useState<"menu" | "edit" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const maxSeconds = endedAt !== null ? Math.max(0, Math.floor((endedAt - startedAt) / 1000)) : seconds;
  const [minutes, setMinutes] = useState(() => String(Math.round(seconds / 60)));

  function submitEdit() {
    const value = Math.round(Number(minutes) * 60);
    if (!Number.isFinite(value) || value < 0) {
      setError("Enter a valid number of minutes.");
      return;
    }
    if (value > maxSeconds) {
      setError(`Can't be more than ${formatFocus(maxSeconds)} — that's as long as the session ran.`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await editFocusSessionTimeAction({ id, seconds: value });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(null);
    });
  }

  function submitDelete() {
    startTransition(async () => {
      await deleteFocusSessionAction(id);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen("menu")}
        aria-label="Session options"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-fg"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open === "menu" && (
        <Sheet open onClose={() => setOpen(null)} title="Session" className="sm:max-w-sm">
          <div className="flex flex-col gap-1 pb-1">
            <button
              type="button"
              onClick={() => setOpen("edit")}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-h-surface2"
            >
              <Pencil className="h-4 w-4 text-h-muted" />
              Edit time
            </button>
            <button
              type="button"
              onClick={() => setOpen("delete")}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-h-bad hover:bg-h-surface2"
            >
              <Trash2 className="h-4 w-4" />
              Delete session
            </button>
          </div>
        </Sheet>
      )}

      {open === "edit" && (
        <Sheet
          open
          onClose={() => setOpen(null)}
          title="Edit session time"
          className="sm:max-w-sm"
          footer={
            <button
              type="button"
              disabled={pending}
              onClick={submitEdit}
              className="w-full rounded-xl bg-h-brand py-2.5 text-sm font-extrabold text-h-brand-fg disabled:opacity-60"
            >
              Save
            </button>
          }
        >
          <div className="flex flex-col gap-2 pb-1 pt-1">
            <label className="text-xs font-bold text-h-muted">Minutes focused</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={Math.ceil(maxSeconds / 60)}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="rounded-xl border border-h-border bg-h-surface px-3 py-2.5 text-sm font-bold tabular-nums"
            />
            <p className="text-[11px] text-h-muted">Up to {formatFocus(maxSeconds)} — this session&apos;s actual length, {status === "withered" ? "withered" : "finished"}.</p>
            {error && <p className="text-xs font-bold text-h-bad">{error}</p>}
          </div>
        </Sheet>
      )}

      {open === "delete" && (
        <ConfirmDialog
          title="Delete this session?"
          message="This removes it from your grove for good. If it counted towards a habit, that time comes back off."
          confirmLabel="Delete"
          onConfirm={submitDelete}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
