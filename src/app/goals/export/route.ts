import { loadGoalsData } from "@/lib/goal-data";
import { getNotesForGoals } from "@/lib/db/repo-goals";
import { goalsToCsv, STATUS_META, TRACKING_META, type GoalExportRow } from "@/lib/goals";

/** GET /goals/export[?goal=ID]: a CSV of the caller's own goals (milestones, progress and journal included). */
export async function GET(request: Request) {
  const { views } = await loadGoalsData();
  const only = Number(new URL(request.url).searchParams.get("goal"));
  const mine = views.filter((v) => v.mine && (!Number.isInteger(only) || only <= 0 || v.goal.id === only));
  const notes = await getNotesForGoals(mine.map((v) => v.goal.id));

  const rows: GoalExportRow[] = mine.map((v) => ({
    title: v.goal.title,
    area: v.goal.area,
    status: STATUS_META[v.goal.status].label,
    tracking: TRACKING_META[v.goal.tracking].label,
    progress: `${Math.round(v.info.pct)}% (${v.info.label})`,
    startDate: v.goal.startDate,
    targetDate: v.goal.targetDate,
    visibility: v.goal.visibility,
    milestones: v.milestones.map((m) => ({ title: m.title, dueDate: m.dueDate, doneAt: m.doneAt })),
    progressEntries: v.progress.map((p) => ({ date: p.date, value: p.value, note: p.note, who: p.who })),
    notes: notes.filter((n) => n.goalId === v.goal.id).map((n) => ({ date: n.createdAt.slice(0, 10), mood: n.mood, body: n.body })),
  }));

  return new Response("﻿" + goalsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${mine.length === 1 ? `goal-${mine[0].goal.id}` : "goals"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
