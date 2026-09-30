import { loadHabitData } from "@/lib/habit-data";
import { recurrenceLabel } from "@/lib/habits";
import { todayIso } from "@/lib/date";
import { TaskManager, type TaskItem } from "@/components/habits/task-manager";

export default async function HabitsTasksPage() {
  const today = todayIso();
  const { profile, readOnly, tasks, categories, completions } = await loadHabitData();

  const items: TaskItem[] = tasks.map((t) => {
    const done = completions[t.id];
    const dates = done ? [...done].sort() : [];
    return {
      id: t.id,
      title: t.title,
      notes: t.notes,
      priority: t.priority,
      categoryId: t.categoryId,
      recurrence: t.recurrence,
      weekdays: t.weekdays,
      recurrenceLabel: recurrenceLabel(t),
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      doneToday: done?.has(today) ?? false,
      timesCompleted: dates.length,
      lastDone: dates.length ? dates[dates.length - 1] : null,
    };
  });

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-3xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">{profile?.name}</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Tasks</h1>
        <p className="text-sm text-h-muted">One-off to-dos and recurring chores, alongside your habits.</p>
      </div>
      <TaskManager
        tasks={items}
        categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color, icon: c.icon }))}
        today={today}
        readOnly={readOnly}
      />
    </div>
  );
}
