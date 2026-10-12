"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { FinanceModal } from "@/components/finance/finance-modal";
import { Switch } from "@/components/finance/ui/switch";
import { saveReminderAction, deleteReminderAction } from "@/lib/finance-actions";
import type { ReminderRow } from "@/lib/db/repo-finance";
import { todayIso } from "@/lib/date";

export function ReminderFormButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5 bg-h-brand text-h-brand-fg hover:opacity-90">
        <Plus className="h-4 w-4" />
        New reminder
      </Button>
      <ReminderFormModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ReminderFormModal({ reminder, open, onClose }: { reminder?: ReminderRow; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(reminder?.title ?? "");
  const [dueDate, setDueDate] = useState(reminder?.dueDate ?? todayIso());
  const [note, setNote] = useState(reminder?.note ?? "");
  const [recurring, setRecurring] = useState(reminder?.recurring ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveReminderAction(reminder?.id ?? null, {
        title,
        dueDate,
        note: note.trim() || null,
        recurring,
      });
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  async function remove() {
    if (!reminder) return;
    if (!confirm(`Delete "${reminder.title}"?`)) return;
    startTransition(async () => {
      const res = await deleteReminderAction(reminder.id);
      if (!res.ok) setError(res.error);
      else onClose();
    });
  }

  return (
    <FinanceModal open={open} onClose={onClose} title={reminder ? "Edit reminder" : "New reminder"}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Renew car insurance" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Due date</span>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold text-h-muted">Note</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm font-semibold">
          Recurring (yearly)
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </label>
        {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          {reminder ? (
            <button type="button" onClick={remove} disabled={pending} className="text-xs font-bold text-h-bad">
              Delete
            </button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={submit} disabled={pending || !title.trim() || !dueDate} className="bg-h-brand text-h-brand-fg hover:opacity-90">
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </FinanceModal>
  );
}
