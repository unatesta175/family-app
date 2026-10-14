"use client";

import { useState, useTransition } from "react";
import { Bell, Check, Repeat } from "lucide-react";
import { setReminderDoneAction } from "@/lib/finance-actions";
import { ReminderFormModal } from "@/components/finance/reminder-form";
import type { ReminderRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

export function ReminderRowItem({ reminder, today, readOnly }: { reminder: ReminderRow; today: string; readOnly: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = !!reminder.doneAt;
  const overdue = !done && reminder.dueDate < today;

  function toggle() {
    startTransition(() => {
      setReminderDoneAction(reminder.id, !done);
    });
  }

  return (
    <li className={cn("flex items-center gap-3 py-3", overdue && "rounded-xl bg-destructive/10 px-2")}>
      <button
        type="button"
        disabled={readOnly || pending}
        onClick={toggle}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done ? "border-success bg-success text-white" : "border-border text-transparent hover:border-primary"
        )}
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        <Check className="h-4 w-4" />
      </button>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", overdue ? "bg-destructive/10 text-destructive" : "bg-violet-500/10 text-violet-600")}>
        <Bell className="h-4 w-4" />
      </span>
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className={cn("flex items-center gap-1.5 text-sm font-bold", done && "text-muted-foreground line-through")}>
          {reminder.title}
          {reminder.recurring && <Repeat className="h-3 w-3 shrink-0 text-violet-500" />}
        </span>
        <span className="block text-[11px] font-semibold text-muted-foreground">
          Due {reminder.dueDate}
          {overdue && " · overdue"}
        </span>
      </button>
      {editing && <ReminderFormModal reminder={reminder} open onClose={() => setEditing(false)} />}
    </li>
  );
}
