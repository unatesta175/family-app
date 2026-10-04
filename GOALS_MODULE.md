# Goals module: plan and checklist

A separate module (next to Prayer and Habits) for the goals you want in life. Habits and tasks are the
daily steps that move a goal forward. Same theme and components as the Habits module.

Legend: `[ ]` to do, `[x]` done.

## Concept
Goals are the "what and why". Habits are the "how, every day". A goal's progress comes from its
milestones, a measurable target you log against, or the habit check-ins linked to it.

## Core features
- [ ] **Goal list.** Title, a "why" note, life area, icon, colour, start and target date, priority.
  - [ ] Statuses: Idea, Active, Paused, Achieved, Dropped.
  - [ ] Pin goals to the top.
  - [ ] Life areas: Faith, Health, Family, Career, Finance, Learning, Personal (editable per goal).
- [ ] **Milestones.** Checkable steps with optional due dates.
- [ ] **Measurable targets (optional).** For example "save 10,000", "run 200 km", "read 12 books".
  - [ ] Log progress entries (amount, note, date).
  - [ ] Progress bar and ring.
  - [ ] Forecast: on track, ahead or behind, with an estimated finish date.
- [ ] **How progress is tracked** (pick one per goal): by milestones, by a measurable target, or by
  linked habits (count check-ins, or reach a streak).
- [ ] **Goal detail page.**
  - [ ] Progress ring and forecast.
  - [ ] Milestones.
  - [ ] Linked habits.
  - [ ] Timeline of progress entries and recent wins.
  - [ ] Calendar-style tabs: Overview and Journal.
- [ ] **Goals home.**
  - [ ] Cards grouped by life area.
  - [ ] Filters by status and area.
  - [ ] "Next milestones" strip.
  - [ ] Stalled-goals warning.

## Integration with the Habit tracker
- [ ] **Link habits to a goal.**
  - [ ] On a goal: add an existing habit or create one that is already linked.
  - [ ] Habit form gets an optional "Goal" dropdown.
  - [ ] Habit cards on Today show a small goal chip.
  - [ ] Habit detail page shows "Contributes to: goal".
- [ ] **Habits drive goal progress.** Reads the same logs and streaks (count check-ins or streak target).
- [ ] **Milestones on Today.** Milestones due today or overdue appear on the Today page and can be ticked there.
- [ ] **Today "Goals focus" card.** Top 1 to 3 goals and what moves them today.
- [ ] **Module switcher** lists Goals; Goals has its own bottom nav and sidebar.

## Family circle
- [ ] **Private by default.** Each goal is private until the owner shares it.
- [ ] **Shareable.** A shared goal is visible to the household.
  - [ ] Members can log progress against it.
  - [ ] Members can link their own habits to support it.
  - [ ] Combined progress across everyone, with who contributed what.

## Extra SaaS features
- [ ] **Templates.** Starter goals with suggested milestones and habits (for example "Memorise a juz'",
  "Build an emergency fund").
- [ ] **Smart forecast.** Estimated finish date from your pace.
- [ ] **Reminders and nudges** (in app): stalled goals, upcoming milestones, deadlines.
- [ ] **Vision board.** Image and quote per goal, with a board page.
- [ ] **Reflection journal.** Notes with a mood, attached to a goal.
- [ ] **Streak of effort.** Weeks in a row with progress on a goal (a badge).
- [ ] **Archive and achieved wall.** Celebration when a goal is achieved, plus a wall of achieved goals.
- [ ] **Weekly review.** Sunday prompt: what moved, what stalled, one thing to change. Past reviews saved.
- [ ] **Export.** CSV download and a printable page (save as PDF) for a goal's history.

## Technical shape
- [ ] New tables: `goals`, `goal_milestones`, `goal_progress`, `goal_habits`, `goal_notes`, `goal_reviews`.
  Created by the startup migration (`CREATE TABLE IF NOT EXISTS`), existing data untouched.
- [ ] Pages: `/goals`, `/goals/[id]`, `/goals/[id]/print`, `/goals/vision`, `/goals/achieved`,
  `/goals/review`, plus `/goals/export` (CSV).
- [ ] Pure logic in `src/lib/goals.ts` (progress, forecast, nudges, streak of effort, templates) with
  script checks.
- [ ] Server actions in `src/lib/goal-actions.ts`; all writes guarded by profile ownership, and sharing
  limited to the same household.
- [ ] Typecheck and lint clean, committed in stages.
