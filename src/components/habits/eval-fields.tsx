"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Hash, ListChecks, Plus, Timer, Trash2, X } from "lucide-react";
import { GOAL_PERIOD_LABEL, OP_LABEL, TIME_OP_LABEL, formatDuration, formatTimeOfDay, type HabitGoal } from "@/lib/habits";
import { GOAL_PERIODS, TARGET_OPS, type GoalPeriod, type HabitEvalType } from "@/lib/db/schema";
import type { HabitFormValues } from "@/lib/habit-form-values";
import { Caption, DurationInput, NumberInput, OptionCard, TimeOfDayInput } from "@/components/habits/form-fields";
import { inputClass } from "@/components/habits/form-bits";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/habits/ui/select";
import { cn } from "@/lib/utils";

type SetField = <K extends keyof HabitFormValues>(key: K, value: HabitFormValues[K]) => void;

const EVAL_OPTIONS: { value: HabitEvalType; title: string; description: string; icon: typeof Hash }[] = [
  { value: "yes_no", title: "Yes or No", description: "Tick it off when it's done", icon: CheckCircle2 },
  { value: "numeric", title: "Numeric value", description: "Track an amount, like pages or glasses", icon: Hash },
  { value: "timer", title: "Timer", description: "Track the time you spend on it", icon: Timer },
  { value: "checklist", title: "Checklist", description: "Complete a set of sub-items", icon: ListChecks },
  { value: "time_of_day", title: "Time of day", description: "Log when it happens, like waking by 9:00 am", icon: Clock },
];

const newId = () => Math.random().toString(36).slice(2, 10);

export function EvaluationFields({ v, set, hex }: { v: HabitFormValues; set: SetField; hex: string }) {
  function pickType(type: HabitEvalType) {
    if (type === v.evalType) return;
    set("evalType", type);
    // Sensible starting goals so the form is valid straight away.
    if (type === "numeric") set("dailyTarget", v.evalType === "timer" || v.evalType === "time_of_day" || v.dailyTarget < 1 ? 1 : v.dailyTarget);
    if (type === "timer") set("dailyTarget", 1800);
    if (type === "time_of_day") {
      set("dailyTarget", 540); // 9:00 am
      set("targetOp", "at_most");
    } else if (v.evalType === "time_of_day") {
      set("targetOp", "at_least");
    }
    if (type === "yes_no" || type === "checklist" || type === "time_of_day") set("goals", []);
    if (type !== "numeric") set("unit", null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="How do you evaluate this habit?" className="grid grid-cols-2 gap-2">
        {EVAL_OPTIONS.map((o) => (
          <OptionCard
            key={o.value}
            active={v.evalType === o.value}
            onClick={() => pickType(o.value)}
            icon={o.icon}
            title={o.title}
            description={o.description}
            accent={hex}
          />
        ))}
      </div>

      {(v.evalType === "numeric" || v.evalType === "timer") && (
        <div className="flex flex-col gap-3 rounded-xl bg-h-surface2 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <Caption>Condition</Caption>
              <OpSelect value={v.targetOp} onChange={(op) => set("targetOp", op)} withAny />
            </label>
            {v.evalType === "numeric" && v.targetOp !== "any" && (
              <label className="flex flex-col gap-1">
                <Caption>Goal</Caption>
                <NumberInput
                  value={v.dailyTarget}
                  min={-1_000_000_000}
                  onChange={(n) => set("dailyTarget", n ?? 0)}
                  placeholder="e.g. 10"
                />
              </label>
            )}
            {v.evalType === "numeric" && (
              <label className="col-span-2 flex flex-col gap-1">
                <Caption>Unit (optional)</Caption>
                <input
                  value={v.unit ?? ""}
                  onChange={(e) => set("unit", e.target.value)}
                  placeholder="e.g. pages, times, hours"
                  maxLength={20}
                  className={inputClass}
                />
              </label>
            )}
          </div>

          {v.evalType === "timer" && v.targetOp !== "any" && (
            <div className="flex flex-col gap-1">
              <Caption>Duration a day</Caption>
              <DurationInput seconds={v.dailyTarget} onChange={(s) => set("dailyTarget", s)} />
            </div>
          )}

          <p className="text-[11px] leading-snug text-h-muted">Each day, {summary(v)}</p>
        </div>
      )}

      {v.evalType === "time_of_day" && (
        <div className="flex flex-col gap-3 rounded-xl bg-h-surface2 p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <Caption>Condition</Caption>
              <OpSelect value={v.targetOp === "any" ? "at_most" : v.targetOp} onChange={(op) => set("targetOp", op)} time />
            </label>
            <label className="flex flex-col gap-1">
              <Caption>Time</Caption>
              <TimeOfDayInput minutes={v.dailyTarget} onChange={(m) => set("dailyTarget", m)} aria-label="Goal time" />
            </label>
          </div>
          <p className="text-[11px] leading-snug text-h-muted">Each day, {timeSummary(v)}</p>
        </div>
      )}

      {v.evalType === "checklist" && <ChecklistEditor v={v} set={set} />}

      {(v.evalType === "numeric" || v.evalType === "timer") && <GoalsEditor v={v} set={set} />}
    </div>
  );
}

function timeSummary(v: HabitFormValues): string {
  const t = formatTimeOfDay(v.dailyTarget);
  switch (v.targetOp) {
    case "at_most":
      return `log the time. ${t} or earlier counts as ${v.kind === "break" ? "clean" : "done"}; later is marked late.`;
    case "at_least":
      return `log the time. ${t} or later counts as ${v.kind === "break" ? "clean" : "done"}; earlier is marked early.`;
    default:
      return `log the time. Only exactly ${t} counts as ${v.kind === "break" ? "clean" : "done"}.`;
  }
}

function summary(v: HabitFormValues): string {
  const amount = v.evalType === "timer" ? formatDuration(v.dailyTarget) : `${v.dailyTarget}${v.unit ? ` ${v.unit}` : ""}`;
  switch (v.targetOp) {
    case "at_least":
      return `reach at least ${amount} to count as done.`;
    case "at_most":
      return `stay under ${amount} to count as done.`;
    case "exactly":
      return `hit exactly ${amount} to count as done.`;
    case "any":
      return v.evalType === "timer" ? "any time you log counts as done." : "any amount you log counts as done.";
  }
}

function OpSelect({
  value,
  onChange,
  withAny,
  time,
}: {
  value: HabitFormValues["targetOp"];
  onChange: (v: HabitFormValues["targetOp"]) => void;
  withAny?: boolean;
  /** Word the options for a time of day. */
  time?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(x) => onChange(x as HabitFormValues["targetOp"])}>
      <SelectTrigger aria-label="Condition">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TARGET_OPS.filter((o) => withAny || o !== "any").map((o) => (
          <SelectItem key={o} value={o}>
            {(time ? TIME_OP_LABEL : OP_LABEL)[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// --- Checklist -------------------------------------------------------------------------------

function ChecklistEditor({ v, set }: { v: HabitFormValues; set: SetField }) {
  const [draft, setDraft] = useState("");

  function add() {
    const title = draft.trim();
    if (!title || v.checklist.length >= 30) return;
    set("checklist", [...v.checklist, { id: newId(), title }]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-h-surface2 p-3">
      <Caption>Sub-items</Caption>
      {v.checklist.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {v.checklist.map((item, i) => (
            <li key={item.id} className="flex items-center gap-2 rounded-lg bg-h-surface px-2.5 py-1.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-h-surface2 text-[10px] font-extrabold text-h-muted">
                {i + 1}
              </span>
              <input
                value={item.title}
                maxLength={80}
                aria-label={`Item ${i + 1}`}
                onChange={(e) =>
                  set(
                    "checklist",
                    v.checklist.map((c) => (c.id === item.id ? { ...c, title: e.target.value } : c))
                  )
                }
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                aria-label={`Remove ${item.title}`}
                onClick={() =>
                  set(
                    "checklist",
                    v.checklist.filter((c) => c.id !== item.id)
                  )
                }
                className="flex h-6 w-6 items-center justify-center rounded-full text-h-muted hover:bg-h-surface2 hover:text-h-bad"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a sub-item…"
          maxLength={80}
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          aria-label="Add sub-item"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-h-brand text-h-brand-fg transition-opacity disabled:opacity-40"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
      <p className="text-[11px] leading-snug text-h-muted">
        {v.checklist.length === 0
          ? "The habit counts as done once every sub-item is ticked."
          : `Done once all ${v.checklist.length} item${v.checklist.length === 1 ? " is" : "s are"} ticked.`}
      </p>
    </div>
  );
}

// --- Extra goals -----------------------------------------------------------------------------

const GOAL_HINT: Record<GoalPeriod, string> = {
  week: "Total across each week",
  month: "Total across each month",
  year: "Total across each year",
  all_time: "Running total since you started",
  single: "Reach it in one go (a single day)",
};

function GoalsEditor({ v, set }: { v: HabitFormValues; set: SetField }) {
  const used = new Set(v.goals.map((g) => g.period));
  const available = GOAL_PERIODS.filter((p) => !used.has(p));
  const unit = v.evalType === "numeric" ? v.unit : null;

  function update(period: GoalPeriod, patch: Partial<HabitGoal>) {
    set(
      "goals",
      v.goals.map((g) => (g.period === period ? { ...g, ...patch } : g))
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-h-border p-3">
      <div>
        <p className="text-sm font-bold leading-tight">Extra goals</p>
        <p className="text-[11px] leading-snug text-h-muted">
          Optional. Add a weekly, monthly, yearly, all-time or single-time target on top of the daily one.
        </p>
      </div>

      {v.goals.map((g) => (
        <div key={g.period} className="flex flex-col gap-2 rounded-xl bg-h-surface2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-extrabold leading-tight">{GOAL_PERIOD_LABEL[g.period]} goal</p>
              <p className="text-[11px] text-h-muted">{GOAL_HINT[g.period]}</p>
            </div>
            <button
              type="button"
              aria-label={`Remove ${GOAL_PERIOD_LABEL[g.period]} goal`}
              onClick={() =>
                set(
                  "goals",
                  v.goals.filter((x) => x.period !== g.period)
                )
              }
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-h-muted hover:bg-h-surface hover:text-h-bad"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className={cn("grid gap-2", v.evalType === "numeric" ? "grid-cols-2" : "grid-cols-1")}>
            <label className="flex flex-col gap-1">
              <Caption>Condition</Caption>
              <OpSelect value={g.op} onChange={(op) => update(g.period, { op: op as HabitGoal["op"] })} />
            </label>
            {v.evalType === "numeric" ? (
              <label className="flex flex-col gap-1">
                <Caption>Goal{unit ? ` (${unit})` : ""}</Caption>
                <NumberInput value={g.value} min={0} onChange={(n) => update(g.period, { value: n ?? 0 })} />
              </label>
            ) : (
              <div className="flex flex-col gap-1">
                <Caption>Duration</Caption>
                <DurationInput seconds={g.value} onChange={(s) => update(g.period, { value: s })} />
              </div>
            )}
          </div>
        </div>
      ))}

      {available.length > 0 && v.goals.length < 5 && (
        <Select
          value=""
          onValueChange={(p) =>
            set("goals", [
              ...v.goals,
              { period: p as GoalPeriod, op: "at_least", value: v.evalType === "timer" ? 3600 : Math.max(1, v.dailyTarget) },
            ])
          }
        >
          <SelectTrigger aria-label="Add an extra goal" className="border-dashed text-h-brand data-[placeholder]:text-h-brand [&>svg]:text-h-brand">
            <span className="flex items-center gap-2 font-bold">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Add a goal
            </span>
          </SelectTrigger>
          <SelectContent>
            {available.map((p) => (
              <SelectItem key={p} value={p}>
                {GOAL_PERIOD_LABEL[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
