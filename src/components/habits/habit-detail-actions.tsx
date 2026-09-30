"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { archiveHabitAction, deleteHabitAction } from "@/lib/habit-actions";
import { HabitFormSheet, type HabitFormValues } from "@/components/habits/habit-form";
import type { CategoryOption } from "@/components/habits/form-bits";

export function HabitDetailActions({
  habit,
  archived,
  categories,
}: {
  habit: HabitFormValues & { id: number };
  archived: boolean;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 rounded-xl bg-h-brand px-4 py-2 text-xs font-extrabold text-h-brand-fg"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => archiveHabitAction(habit.id, !archived))}
          className="flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-4 py-2 text-xs font-bold text-h-muted hover:text-h-fg"
        >
          {archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          {archived ? "Restore" : "Archive"}
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteHabitAction(habit.id);
                  router.replace("/habits/manage");
                })
              }
              className="rounded-xl bg-h-bad px-4 py-2 text-xs font-extrabold text-white"
            >
              Delete forever
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl px-3 py-2 text-xs font-bold text-h-muted"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 rounded-xl border border-h-border bg-h-surface px-4 py-2 text-xs font-bold text-h-bad"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>
      {editing && (
        <HabitFormSheet open onClose={() => setEditing(false)} initial={habit} categories={categories} />
      )}
    </>
  );
}
