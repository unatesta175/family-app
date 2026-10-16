"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/finance/ui/button";
import { Input } from "@/components/finance/ui/input";
import { FinanceModal, FinanceField } from "@/components/finance/finance-modal";
import { Switch } from "@/components/finance/ui/switch";
import { saveReminderAction, deleteReminderAction } from "@/lib/finance-actions";
import type { ReminderRow } from "@/lib/db/repo-finance";
import { todayIso } from "@/lib/date";

export function ReminderFormButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
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
    <FinanceModal
      open={open}
      onClose={onClose}
      title={reminder ? "Edit reminder" : "New reminder"}
      onSave={submit}
      saveLabel={pending ? "Saving…" : "Save"}
      saveDisabled={pending || !title.trim() || !dueDate}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <FinanceField label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Renew car insurance" />
        </FinanceField>
        <FinanceField label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FinanceField>
        <FinanceField label="Note">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </FinanceField>
        <label className="flex items-center justify-between gap-3 rounded-sm border border-border bg-surface px-4 py-3.5">
          <span className="text-sm font-semibold text-foreground">Recurring (yearly)</span>
          <Switch checked={recurring} onCheckedChange={setRecurring} />
        </label>
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
        {reminder && (
          <button type="button" onClick={remove} disabled={pending} className="self-center text-xs font-bold text-destructive">
            Delete
          </button>
        )}
      </div>
    </FinanceModal>
  );
}
