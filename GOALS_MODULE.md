# Goals module: plan and checklist

A separate module (next to Prayer and Habits) for the goals you want in life. Habits and tasks are the
daily steps that move a goal forward. Same theme and components as the Habits module.

Legend: `[ ]` to do, `[x]` done.

## Concept
Goals are the "what and why". Habits are the "how, every day". A goal's progress comes from its
milestones, a measurable target you log against, or the habit check-ins linked to it.

## Core features
- [x] **Goal list.** Title, a "why" note, life area, icon, colour, start and target date, priority.
  - [x] Statuses: Idea, Active, Paused, Achieved, Dropped.
  - [x] Pin goals to the top.
  - [x] Life areas: Faith, Health, Family, Career, Finance, Learning, Personal (editable per goal).
- [x] **Milestones.** Checkable steps with optional due dates.
- [x] **Measurable targets (optional).** For example "save 10,000", "run 200 km", "read 12 books".
  - [x] Log progress entries (amount, note, date).
  - [x] Progress bar and ring.
  - [x] Forecast: on track, ahead or behind, with an estimated finish date.
- [x] **How progress is tracked** (pick one per goal): by milestones, by a measurable target, or by
  linked habits (count check-ins, or reach a streak).
- [x] **Goal detail page.**
  - [x] Progress ring and forecast.
  - [x] Milestones.
  - [x] Linked habits.
  - [x] Timeline of progress entries and recent wins.
  - [x] Calendar-style tabs: Overview and Journal.
- [x] **Goals home.**
  - [x] Cards grouped by life area.
  - [x] Filters by status and area.
  - [x] "Next milestones" strip.
  - [x] Stalled-goals warning.

## Integration with the Habit tracker
- [x] **Link habits to a goal.**
  - [x] On a goal: add an existing habit or create one that is already linked.
  - [x] Habit form gets an optional "Goal" dropdown.
  - [x] Habit cards on Today show a small goal chip.
  - [x] Habit detail page shows "Contributes to: goal".
- [x] **Habits drive goal progress.** Reads the same logs and streaks (count check-ins or streak target).
- [x] **Milestones on Today.** Milestones due today or overdue appear on the Today page and can be ticked there.
- [x] **Today "Goals focus" card.** Top 1 to 3 goals and what moves them today.
- [x] **Module switcher** lists Goals; Goals has its own bottom nav and sidebar.

## Family circle
- [x] **Private by default.** Each goal is private until the owner shares it.
- [x] **Shareable.** A shared goal is visible to the household.
  - [x] Members can log progress against it.
  - [x] Members can link their own habits to support it.
  - [x] Combined progress across everyone, with who contributed what.

## Extra SaaS features
- [x] **Templates.** Starter goals with suggested milestones and habits (for example "Memorise a juz'",
  "Build an emergency fund").
- [x] **Smart forecast.** Estimated finish date from your pace.
- [x] **Reminders and nudges** (in app): stalled goals, upcoming milestones, deadlines.
- [x] **Vision board.** Image and quote per goal, with a board page.
- [x] **Reflection journal.** Notes with a mood, attached to a goal.
- [x] **Streak of effort.** Weeks in a row with progress on a goal (a badge).
- [x] **Archive and achieved wall.** Celebration when a goal is achieved, plus a wall of achieved goals.
- [x] **Weekly review.** Sunday prompt: what moved, what stalled, one thing to change. Past reviews saved.
- [x] **Export.** CSV download and a printable page (save as PDF) for a goal's history.

## Technical shape
- [x] New tables: `goals`, `goal_milestones`, `goal_progress`, `goal_habits`, `goal_notes`, `goal_reviews`.
  Created by the startup migration (`CREATE TABLE IF NOT EXISTS`), existing data untouched.
- [x] Pages: `/goals`, `/goals/[id]`, `/goals/[id]/print`, `/goals/vision`, `/goals/achieved`,
  `/goals/review`, plus `/goals/export` (CSV).
- [x] Pure logic in `src/lib/goals.ts` (progress, forecast, nudges, streak of effort, templates) with
  script checks.
- [x] Server actions in `src/lib/goal-actions.ts`; all writes guarded by profile ownership, and sharing
  limited to the same household.
- [x] Typecheck and lint clean, committed in stages.

## Verification notes
- Typecheck and lint pass. `scripts/goals-check.ts` covers progress, forecast, nudges, streak of effort,
  weekly review dates, templates and CSV (run `npx tsx scripts/goals-check.ts`).
- The new tables were checked against a throwaway SQLite database: private by default, one link per
  goal and habit, one review per week, deleting a goal removes its children, re-running is harmless.
- Not yet clicked through in a browser: do a pass over the new pages after the first deploy.
