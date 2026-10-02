"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Flame, Pencil, Plus, Trash2 } from "lucide-react";
import { archiveHabitAction, deleteCategoryAction, deleteHabitAction } from "@/lib/habit-actions";
import { STREAK_UNIT_SHORT, colorHex, tint, type StreakResult } from "@/lib/habits";
import { habitIcon } from "@/lib/habit-icons";
import { HabitFormSheet } from "@/components/habits/habit-form";
import type { HabitFormValues } from "@/lib/habit-form-values";
import { CategorySheet } from "@/components/habits/category-sheet";
import type { CategoryOption } from "@/components/habits/form-bits";
import { cn } from "@/lib/utils";

export type ManageHabit = HabitFormValues & {
  id: number;
  scheduleLabel: string;
  targetLabel: string | null;
  archived: boolean;
  streak: number;
  streakUnit: StreakResult["unit"];
};

export function HabitManager({
  habits,
  categories,
  readOnly,
  circleSize = 1,
}: {
  habits: ManageHabit[];
  categories: CategoryOption[];
  readOnly: boolean;
  circleSize?: number;
}) {
  const [editing, setEditing] = useState<ManageHabit | null>(null);
  const [catSheet, setCatSheet] = useState<{ cat: CategoryOption | null } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const active = habits.filter((h) => !h.archived);
  const archived = habits.filter((h) => h.archived);

  const groups = [
    ...categories.map((c) => ({ key: `c${c.id}`, title: c.name, cat: c, items: active.filter((h) => h.categoryId === c.id) })),
    { key: "none", title: "No category", cat: null, items: active.filter((h) => h.categoryId === null) },
  ].filter((g) => g.items.length > 0);

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      setConfirm(null);
    });
  }

  function row(h: ManageHabit) {
    const hex = colorHex(h.color);
    const Icon = habitIcon(h.icon);
    return (
      <div key={h.id} className={cn("h-card flex items-center gap-3 p-3", h.archived && "opacity-70")}>
        <Link href={`/habits/${h.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: tint(hex, 0.14), color: hex }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-tight">{h.name}</span>
            <span className="flex flex-wrap items-center gap-x-2 text-[11px] font-medium text-h-muted">
              <span className={h.kind === "break" ? "font-bold text-h-break" : "font-bold text-h-brand"}>
                {h.kind === "break" ? "Break" : "Build"}
              </span>
              <span>{h.scheduleLabel}</span>
              {h.targetLabel && <span>{h.targetLabel}/day</span>}
              {h.priority > 0 && <span className="font-bold">P{h.priority}</span>}
              {h.streak > 0 && (
                <span className="flex items-center gap-0.5 font-bold text-h-break">
                  <Flame className="h-3 w-3" />
                  {h.streak}
                  {STREAK_UNIT_SHORT[h.streakUnit]}
                </span>
              )}
            </span>
          </span>
        </Link>
        {!readOnly &&
          (confirm === `h${h.id}` ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => run(() => deleteHabitAction(h.id))}
                className="rounded-full bg-h-bad px-2.5 py-1 text-[11px] font-bold text-white"
              >
                Delete forever
              </button>
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-full px-2 py-1 text-[11px] font-bold text-h-muted"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-0.5">
              <IconBtn label="Edit" onClick={() => setEditing(h)} icon={Pencil} />
              <IconBtn
                label={h.archived ? "Restore" : "Archive"}
                onClick={() => run(() => archiveHabitAction(h.id, !h.archived))}
                icon={h.archived ? ArchiveRestore : Archive}
              />
              <IconBtn label="Delete" onClick={() => setConfirm(`h${h.id}`)} icon={Trash2} danger />
            </div>
          ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.length === 0 && archived.length === 0 && (
        <p className="h-card p-6 text-center text-sm text-h-muted">
          No habits yet. Use the + button to create your first one.
        </p>
      )}

      {groups.map((g) => {
        const hex = g.cat ? colorHex(g.cat.color) : "var(--h-muted)";
        return (
          <section key={g.key} className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: hex }} />
              {g.title}
              <span className="rounded-full bg-h-surface2 px-2 py-0.5 text-[10px]">{g.items.length}</span>
            </h3>
            {g.items.map(row)}
          </section>
        );
      })}

      {archived.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="px-1 text-xs font-extrabold uppercase tracking-wider text-h-muted">
            Archived · {archived.length}
          </h3>
          {archived.map(row)}
        </section>
      )}

      {/* Categories CRUD */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-h-muted">Categories</h3>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setCatSheet({ cat: null })}
              className="flex items-center gap-1 rounded-full bg-h-brand-soft px-3 py-1 text-xs font-bold text-h-brand"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="h-card p-4 text-center text-xs text-h-muted">
            No categories yet. Categories group habits and tasks (e.g. Health, Learning, Digital Detox).
          </p>
        ) : (
          <div className="h-card divide-y divide-h-border">
            {categories.map((c) => {
              const hex = colorHex(c.color);
              const Icon = habitIcon(c.icon);
              const count = habits.filter((h) => h.categoryId === c.id).length;
              return (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: tint(hex, 0.14), color: hex }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-bold">
                    {c.name}
                    <span className="ml-2 text-[11px] font-medium text-h-muted">
                      {count} habit{count === 1 ? "" : "s"}
                    </span>
                  </span>
                  {!readOnly &&
                    (confirm === `c${c.id}` ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => run(() => deleteCategoryAction(c.id))}
                          className="rounded-full bg-h-bad px-2.5 py-1 text-[11px] font-bold text-white"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirm(null)}
                          className="rounded-full px-2 py-1 text-[11px] font-bold text-h-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <IconBtn label="Edit category" onClick={() => setCatSheet({ cat: c })} icon={Pencil} />
                        <IconBtn label="Delete category" onClick={() => setConfirm(`c${c.id}`)} icon={Trash2} danger />
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        )}
        <p className="px-1 text-[11px] text-h-muted">Deleting a category keeps its habits — they just become uncategorised.</p>
      </section>

      {editing && (
        <HabitFormSheet
          open
          onClose={() => setEditing(null)}
          initial={editing}
          categories={categories}
          circleSize={circleSize}
        />
      )}
      {catSheet && <CategorySheet onClose={() => setCatSheet(null)} initial={catSheet.cat} />}
    </div>
  );
}

function IconBtn({
  label,
  icon: Icon,
  onClick,
  danger,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2",
        danger ? "hover:text-h-bad" : "hover:text-h-fg"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
