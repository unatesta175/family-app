"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, Download, Lock, Pencil, Pin, PinOff, Printer, Trash2, Users } from "lucide-react";
import { deleteGoalAction, setGoalPinnedAction, setGoalStatusAction, setGoalVisibilityAction } from "@/lib/goal-actions";
import { STATUS_META } from "@/lib/goals";
import { GOAL_STATUSES, type GoalStatus, type GoalVisibility } from "@/lib/db/schema";
import { GoalFormSheet, type GoalFormValues } from "@/components/goals/goal-form";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";
import { Switch } from "@/components/habits/ui/switch";
import { cn } from "@/lib/utils";

/** Edit, status, pin, share, print, export and delete for a goal the viewer owns. */
export function GoalActionsBar({
  form,
  status,
  pinned,
  visibility,
  reached,
}: {
  form: GoalFormValues & { id: number };
  status: GoalStatus;
  pinned: boolean;
  visibility: GoalVisibility;
  /** Progress has hit 100% while the goal is still open: offer to mark it achieved. */
  reached: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [, startTransition] = useTransition();
  const id = form.id;

  function changeStatus(next: GoalStatus) {
    startTransition(async () => {
      await setGoalStatusAction(id, next);
      if (next === "achieved") setCelebrate(true);
    });
  }

  return (
    <>
      {reached && status !== "achieved" && (
        <div className="h-card flex items-center gap-3 bg-gradient-to-r from-h-good/15 to-h-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-h-good text-white">
            <Award className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">You reached 100%</p>
            <p className="text-xs text-h-muted">Mark this goal as achieved and put it on your wall.</p>
          </div>
          <button type="button" onClick={() => changeStatus("achieved")} className="shrink-0 rounded-xl bg-h-good px-3 py-2 text-xs font-extrabold text-white">
            Mark achieved
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setEditing(true)} className="flex items-center gap-1.5 rounded-xl bg-h-brand px-4 py-2 text-xs font-extrabold text-h-brand-fg">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>

        <div className="w-36">
          <Select value={status} onValueChange={(s) => changeStatus(s as GoalStatus)}>
            <SelectTrigger aria-label="Status" className="h-9 text-xs font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOAL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={() => startTransition(() => setGoalPinnedAction(id, !pinned))}
          aria-pressed={pinned}
          className={cn(
            "flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold",
            pinned ? "border-h-brand bg-h-brand-soft text-h-brand" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
          )}
        >
          {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          {pinned ? "Unpin" : "Pin"}
        </button>

        <a href={`/goals/${id}/print`} className="flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-3 py-2 text-xs font-bold text-h-muted hover:text-h-fg">
          <Printer className="h-3.5 w-3.5" />
          Print / PDF
        </a>
        <a href={`/goals/export?goal=${id}`} className="flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-3 py-2 text-xs font-bold text-h-muted hover:text-h-fg">
          <Download className="h-3.5 w-3.5" />
          CSV
        </a>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-3 py-2 text-xs font-bold text-h-bad hover:bg-h-bad/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl bg-h-surface2 px-3 py-2.5">
        <span className="flex min-w-0 items-start gap-2">
          {visibility === "shared" ? <Users className="mt-0.5 h-4 w-4 shrink-0 text-h-brand" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0 text-h-muted" />}
          <span>
            <span className="block text-sm font-bold leading-tight">{visibility === "shared" ? "Shared with your family" : "Private"}</span>
            <span className="block text-[11px] leading-snug text-h-muted">
              {visibility === "shared"
                ? "Family members can see this goal, log progress and link their own habits."
                : "Only you can see this goal."}
            </span>
          </span>
        </span>
        <Switch
          checked={visibility === "shared"}
          onCheckedChange={(c) => startTransition(() => setGoalVisibilityAction(id, c ? "shared" : "private"))}
          aria-label="Share with my family circle"
        />
      </label>

      {editing && <GoalFormSheet open onClose={() => setEditing(false)} initial={form} />}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this goal?"
          message="This removes the goal with its milestones, progress, notes and habit links. Your habits themselves are kept. You can't undo it."
          confirmLabel="Delete goal"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() =>
            startTransition(async () => {
              await deleteGoalAction(id);
              router.push("/goals");
            })
          }
        />
      )}
      {celebrate && <Celebration onDone={() => setCelebrate(false)} />}
    </>
  );
}

/** A short confetti burst when a goal is achieved. Deterministic pieces, so there's no render-time randomness. */
function Celebration({ onDone }: { onDone: () => void }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: (i * 37) % 100,
        delay: ((i * 53) % 90) / 100,
        duration: 2.2 + ((i * 29) % 14) / 10,
        dx: `${((i * 61) % 80) - 40}px`,
        size: 6 + ((i * 17) % 8),
        color: ["#d97706", "#10b981", "#f59e0b", "#f43f5e", "#0ea5e9", "#ec4899"][i % 6],
      })),
    []
  );
  return (
    <div className="no-print fixed inset-0 z-[300] flex items-center justify-center bg-black/35 backdrop-blur-[2px]" onClick={onDone} role="dialog" aria-label="Goal achieved">
      {pieces.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="pointer-events-none absolute top-0 rounded-[2px]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.6,
            background: p.color,
            animation: `goal-confetti ${p.duration}s ${p.delay}s ease-in forwards`,
            ["--dx" as string]: p.dx,
          }}
        />
      ))}
      <div className="habit-sheet-in relative mx-6 flex max-w-xs flex-col items-center gap-2 rounded-3xl bg-h-surface p-8 text-center text-h-fg shadow-2xl">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-h-good/15 text-h-good">
          <Award className="h-8 w-8" />
        </span>
        <p className="text-xl font-extrabold">Goal achieved!</p>
        <p className="text-sm text-h-muted">Alhamdulillah. That took real effort. It&apos;s on your wall now.</p>
        <button type="button" onClick={onDone} className="mt-2 rounded-xl bg-h-brand px-5 py-2 text-sm font-extrabold text-h-brand-fg">
          Continue
        </button>
      </div>
    </div>
  );
}
