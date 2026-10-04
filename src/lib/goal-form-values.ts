import type { GoalRow } from "@/lib/db/repo-goals";
import type { GoalFormValues } from "@/components/goals/goal-form";

/** A goal row as the edit form's starting values. */
export function goalToForm(g: GoalRow): GoalFormValues & { id: number } {
  return {
    id: g.id,
    title: g.title,
    why: g.why ?? "",
    area: g.area,
    icon: g.icon,
    color: g.color,
    priority: g.priority,
    startDate: g.startDate,
    targetDate: g.targetDate,
    visibility: g.visibility,
    tracking: g.tracking,
    targetValue: g.targetValue ?? 100,
    targetUnit: g.targetUnit ?? "",
    startValue: g.startValue,
    habitKind: g.habitKind,
    habitTarget: g.habitTarget ?? 30,
    quote: g.quote ?? "",
    imageData: g.imageData,
  };
}
