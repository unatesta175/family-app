"use client";

import { useState, useTransition } from "react";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { applyPresetAction, createRoutineAction, deleteRoutineAction, renameRoutineAction } from "@/lib/time-actions";
import { DAY_PRESETS, WEEKDAY_SHORT, WEEK_ORDER } from "@/lib/time-planner";
import type { PlannerRoutine } from "@/lib/time-data";
import { Sheet } from "@/components/habits/sheet";
import { ConfirmDialog } from "@/components/habits/confirm-dialog";
import { inputClass } from "@/components/habits/form-bits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";

/** Create, rename, copy and delete routines, or jump to a ready-made week shape. */
export function RoutineManager({
  routines,
  dayMap,
  onClose,
}: {
  routines: PlannerRoutine[];
  dayMap: (number | null)[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [copyFrom, setCopyFrom] = useState("none");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [confirm, setConfirm] = useState<PlannerRoutine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && !res.ok) setError(res.error ?? "Something went wrong.");
    });
  }

  const daysFor = (id: number) => WEEK_ORDER.filter((w) => dayMap[w] === id).map((w) => WEEKDAY_SHORT[w]);

  return (
    <>
      <Sheet open onClose={onClose} title="Routines" className="sm:max-w-lg">
        <div className="flex flex-col gap-4 pb-2 pt-1">
          <p className="text-xs leading-snug text-h-muted">
            A routine is one kind of day. Give several days the same routine (for example Tuesday to Thursday the same as Monday), or make a different one for Friday.
          </p>

          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-h-muted">Quick setup</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {DAY_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => applyPresetAction(p.key))}
                  className="rounded-xl border border-h-border bg-h-surface px-3 py-2.5 text-left transition-colors hover:bg-h-surface2 disabled:opacity-60"
                >
                  <span className="block text-sm font-extrabold">{p.label}</span>
                  <span className="block text-[11px] text-h-muted">{p.routines.join(" · ")}. Assigns your days and keeps any routine with the same name.</span>
                </button>
              ))}
            </div>
          </div>

          <ul className="flex flex-col divide-y divide-h-border rounded-2xl border border-h-border">
            {routines.length === 0 && <li className="p-4 text-center text-xs text-h-muted">No routines yet.</li>}
            {routines.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-3 py-2.5">
                {editing?.id === r.id ? (
                  <form
                    className="flex min-w-0 flex-1 items-center gap-2"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      run(async () => {
                        const res = await renameRoutineAction(editing);
                        if (res.ok) setEditing(null);
                        return res;
                      });
                    }}
                  >
                    <input autoFocus value={editing.name} onChange={(ev) => setEditing({ id: r.id, name: ev.target.value })} maxLength={30} className={inputClass} aria-label="Routine name" />
                    <button type="submit" className="rounded-xl bg-h-brand px-3 py-2 text-xs font-bold text-h-brand-fg">
                      Save
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{r.name}</p>
                      <p className="text-[11px] text-h-muted">
                        {r.blocks.length} activit{r.blocks.length === 1 ? "y" : "ies"} · {daysFor(r.id).join(", ") || "not used by any day"}
                      </p>
                    </div>
                    <button type="button" aria-label={`Rename ${r.name}`} onClick={() => setEditing({ id: r.id, name: r.name })} className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-fg">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label={`Delete ${r.name}`} onClick={() => setConfirm(r)} className="flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 rounded-2xl bg-h-surface2 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-h-muted">New routine</p>
            <input value={name} onChange={(ev) => setName(ev.target.value)} placeholder="e.g. Exam week, Travel day" maxLength={30} className={inputClass} />
            {routines.length > 0 && (
              <Select value={copyFrom} onValueChange={setCopyFrom}>
                <SelectTrigger aria-label="Copy activities from">
                  <span className="flex items-center gap-2">
                    <Copy className="h-3.5 w-3.5 text-h-muted" />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Start empty</SelectItem>
                  {routines.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      Copy from {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() =>
                run(async () => {
                  const res = await createRoutineAction({ name, copyFromId: copyFrom === "none" ? null : Number(copyFrom) });
                  if (res.ok) {
                    setName("");
                    setCopyFrom("none");
                  }
                  return res;
                })
              }
              className="flex items-center justify-center gap-1.5 rounded-xl bg-h-brand py-2.5 text-sm font-extrabold text-h-brand-fg disabled:opacity-50"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Create routine
            </button>
          </div>
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
        </div>
      </Sheet>

      {confirm && (
        <ConfirmDialog
          title={`Delete "${confirm.name}"?`}
          message={`This removes the routine and its ${confirm.blocks.length} activit${confirm.blocks.length === 1 ? "y" : "ies"}. ${daysFor(confirm.id).length ? `${daysFor(confirm.id).join(", ")} will have no routine until you pick another. ` : ""}You can't undo it.`}
          confirmLabel="Delete routine"
          onClose={() => setConfirm(null)}
          onConfirm={() => run(() => deleteRoutineAction(confirm.id))}
        />
      )}
    </>
  );
}
