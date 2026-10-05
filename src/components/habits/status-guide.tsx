"use client";

import { useState } from "react";
import { AlarmClock, Ban, Check, CircleHelp, CornerDownRight, Minus, Repeat, SkipForward, X } from "lucide-react";
import { Sheet } from "@/components/habits/sheet";
import { STATUS_COLOR, statusStyle } from "@/lib/habits";
import { cn } from "@/lib/utils";

/** A "?" button that opens a plain-language guide to every status a habit or task can have. */
export function StatusGuideButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Status guide"
        title="What do the statuses mean?"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-h-border bg-h-surface text-h-muted transition-colors hover:text-h-brand",
          className
        )}
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      {open && <StatusGuide onClose={() => setOpen(false)} />}
    </>
  );
}

type Item = {
  marker: React.ReactNode;
  title: string;
  meaning: string;
  effect: string;
  tone?: "good" | "bad" | "neutral";
};

const BRAND = "#5b5bf0";
const chip = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2";

const HABIT_STATUSES: Item[] = [
  {
    marker: (
      <span className={chip} style={statusStyle("done", true)}>
        <Check className="h-4 w-4" strokeWidth={3.5} />
      </span>
    ),
    title: "Done / Clean",
    meaning: "You met the day's goal. For a break habit it means you stayed clean.",
    effect: "Adds to your streak and completion rate, and lifts your habit score.",
    tone: "good",
  },
  {
    marker: (
      <span className={chip} style={statusStyle("partial", false)}>
        <Minus className="h-4 w-4" strokeWidth={3.5} />
      </span>
    ),
    title: "Partial",
    meaning: "Numbers, timers and checklists: you logged something, but not enough to meet the goal yet.",
    effect: "Not done, so it doesn't extend the streak. Keep going and it turns Done once the goal is met.",
  },
  {
    marker: (
      <span className={cn(chip, "border-dashed")} style={{ background: `${STATUS_COLOR.pending}14`, borderColor: STATUS_COLOR.pending, color: STATUS_COLOR.pending }}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
    ),
    title: "Pending",
    meaning: "Due today and nothing logged yet.",
    effect: "No effect while the day is still open. It only counts against you if it ends up missed.",
  },
  {
    marker: (
      <span className={chip} style={statusStyle("missed", false)}>
        <X className="h-4 w-4" strokeWidth={3} />
      </span>
    ),
    title: "Missed",
    meaning: "You marked it missed, or the day passed with nothing logged.",
    effect: "Breaks the streak, counts against the completion rate and lowers the habit score.",
    tone: "bad",
  },
  {
    marker: (
      <span className={chip} style={statusStyle("slipped", true)}>
        <X className="h-4 w-4" strokeWidth={3.5} />
      </span>
    ),
    title: "Slipped",
    meaning: "Break habits only: you gave in and did the thing you're quitting.",
    effect: "Same as missed: ends the streak and counts as a failed day.",
    tone: "bad",
  },
  {
    marker: (
      <span className={chip} style={statusStyle("skipped", false)}>
        <SkipForward className="h-4 w-4" />
      </span>
    ),
    title: "Skipped",
    meaning: "A deliberate rest day (illness, travel…).",
    effect: "Neutral. It neither extends nor breaks your streak, and it's left out of your completion rate.",
  },
  {
    marker: (
      <span className={cn(chip, "border-h-border bg-h-surface2 text-h-break")}>
        <CornerDownRight className="h-4 w-4" />
      </span>
    ),
    title: "Carried over (From Mon)",
    meaning: "A flexible habit you didn't do on its scheduled day. It stays on your list until you do it.",
    effect: "Not missed yet. It only becomes missed when its next scheduled day arrives.",
  },
  {
    marker: (
      <span className={cn(chip, "border-transparent bg-h-surface2 text-h-muted")}>
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
    ),
    title: "Not started yet",
    meaning: "You're looking at a date before the habit's start date.",
    effect: "Ignored by streaks and stats. If you log it, the start date moves back to that day and it counts.",
  },
];

const TASK_STATUSES: Item[] = [
  {
    marker: <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-h-muted" />,
    title: "To do",
    meaning: "Due today, or has no due date and is still open.",
    effect: "Counts as something left in today's progress ring.",
  },
  {
    marker: (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: BRAND, color: "#fff" }}>
        <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
      </span>
    ),
    title: "Done",
    meaning: "You completed it. A one-off task stays done; a repeating task is done for that day only.",
    effect: "Counts towards today's progress ring and your tasks-completed stats.",
    tone: "good",
  },
  {
    marker: (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-h-bad">
        <AlarmClock className="h-5 w-5" />
      </span>
    ),
    title: "Overdue",
    meaning: "A one-off task whose due date passed without being completed.",
    effect: "It keeps showing on today's list until you finish it. It doesn't affect any habit streak.",
    tone: "bad",
  },
  {
    marker: (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-h-muted">
        <Repeat className="h-5 w-5" />
      </span>
    ),
    title: "Repeating",
    meaning: "Comes back daily, weekly or monthly. Each occurrence is ticked off separately.",
    effect: "Ticking today's occurrence doesn't touch the others.",
  },
];

function Row({ item }: { item: Item }) {
  return (
    <li className="flex gap-3 py-3">
      <div className="flex w-9 justify-center pt-0.5">{item.marker}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-tight">{item.title}</p>
        <p className="mt-0.5 text-xs leading-snug text-h-muted">{item.meaning}</p>
        <p
          className={cn(
            "mt-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold leading-snug",
            item.tone === "good" && "bg-h-good/12 text-h-good",
            item.tone === "bad" && "bg-h-bad/10 text-h-bad",
            !item.tone || item.tone === "neutral" ? "bg-h-surface2 text-h-muted" : ""
          )}
        >
          <span className="font-extrabold">Effect: </span>
          {item.effect}
        </p>
      </div>
    </li>
  );
}

function StatusGuide({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"habits" | "tasks">("habits");
  const items = tab === "habits" ? HABIT_STATUSES : TASK_STATUSES;
  return (
    <Sheet open onClose={onClose} title="Status guide" className="sm:max-w-lg">
      <div className="flex flex-col gap-3 pt-1">
        <p className="text-xs leading-snug text-h-muted">
          What each status means and what it does to your streaks, rates and progress.
        </p>
        <div className="flex gap-1 rounded-xl bg-h-surface2 p-1">
          {(["habits", "tasks"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-lg px-2 py-2 text-xs font-bold capitalize transition-all",
                tab === t ? "bg-h-surface text-h-fg shadow-sm" : "text-h-muted hover:text-h-fg"
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-h-border">
          {items.map((item) => (
            <Row key={item.title} item={item} />
          ))}
        </ul>
        {tab === "habits" && (
          <p className="flex items-start gap-2 rounded-xl bg-h-surface2 px-3 py-2 text-[11px] leading-snug text-h-muted">
            <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Tap a habit&apos;s icon to cycle its status. Open the ⋯ menu to skip a day, mark it missed or reset it.
          </p>
        )}
      </div>
    </Sheet>
  );
}
