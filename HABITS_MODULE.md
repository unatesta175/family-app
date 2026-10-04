# Habit Tracker Module

The second module of Istiqamahly (after Prayer). It lives under `/habits`, has its **own layout, colour theme and navigation**, and reuses the household/profile model so Ilyas and Anis can see each other's habits (read-only, exactly like the prayer module).

Status: **implemented** (this document was the plan; the "Decisions" section records what was actually built and why).

---

## 1. Research: what the best habit trackers do

Reviewed the feature sets of Streaks, Habitica, Loop Habit Tracker, HabitKit, Habitify, TickTick, Todoist, Productive, Way of Life and "I Am Sober"-style quit trackers. The features that showed up repeatedly, and that this module adopts:

| Feature | Seen in | In this module |
|---|---|---|
| One-tap check-off from a "Today" list with a progress ring | Streaks, Habitify, Productive | Today page: ring, pending / completed sections, optimistic taps |
| Streaks (current + best) | Streaks, Loop, HabitKit | Per habit; day-based, or week-based for "N per week" habits |
| Flexible schedules (daily, chosen weekdays, N times per week) | Loop, Habitify, Streaks | `daily`, `weekdays`, `weekly_count` |
| Counter / quantity habits (8 glasses, 20 pages) | Habitify, Loop | `dailyTarget` + `unit`, +/− stepper and progress bar |
| Build **and** break (quit) habits | Way of Life, I Am Sober, Habitica | `kind = build | break`; break habits use "Clean / Slipped" |
| Skip / rest day that doesn't break a streak | Streaks, Habitify | `skipped` status (neutral for streaks and rates) |
| Weekly grid: every habit × every day | Loop, Habitify | Week page, tap a cell to check it off, any past week |
| Contribution-style heatmap | HabitKit, GitHub | Per-habit heatmap (13–26 weeks) in Stats and detail page |
| Completion rate + trend charts | Loop, Habitify | Stats page: 7/30/90-day rate, daily-completion trend, weekly bars |
| Categories / areas with colour + icon | Habitify, TickTick | User-defined categories (CRUD), habit colour + icon pickers |
| One-off tasks **and** recurring tasks beside habits | TickTick, Todoist, Productive | Tasks page: one-off (due date, priority) and recurring (daily / weekly / monthly) |
| Notes on a day | Streaks, Loop | Optional note per day entry (day editor in habit detail) |
| Archive instead of delete | Habitify, Streaks | Archive / restore, plus permanent delete with confirm |
| Backfilling past days | all of them | Any past day is editable (week grid, calendar, Today date strip) |
| Dark mode, mobile-first + desktop layout | all of them | Own light/dark tokens; bottom bar on phones, sidebar on desktop |
| Accountability partner | Habitica (party), Streaks (friends) | Family strip: household members' progress, tap to view their board (read-only) |

Deliberately **not** copied: gamified XP/pets (Habitica) — wrong tone for this app; push reminders (needs a notification pipeline, out of scope for v1).

---

## 2. Navigating between Prayer and Habits

**Decision: a module switcher in the top-left of every header** (a pill showing the current module, opening a small menu).

Why there, and not elsewhere:
- The bottom navs stay module-specific (Prayer: Home / Stats / Garden / History / Settings; Habits: Today / Week / Tasks / Stats / Habits). Adding more icons would push either bar past the ~5-item mobile limit.
- The top-left is the standard "workspace switcher" position (Notion, Linear, Slack), so it is where people look first.
- It is present on **every page of both modules**, so switching is always one tap + one tap, and it scales: Finance, Sunnah and Akhlaq are already listed as "Coming soon" in the menu.
- Prayer's Home page stays exactly as it was; nothing is buried a level deeper.

Component: `src/components/module-switcher.tsx`, used by `src/app/(app)/layout.tsx` (Prayer) and `src/app/habits/layout.tsx` (Habits).

---

## 3. Visual identity

Distinct from Prayer's emerald/gold + garden motif:

- **Cool indigo brand** (`#5b5bf0`) on a soft slate canvas, white "SaaS" cards with hairline borders and soft shadows.
- **Warm orange** is reserved for *break* habits (and streak flames), so build-vs-break reads at a glance.
- Each habit/category has its own colour + icon (10-colour palette); done cells and heatmaps use the habit's colour.
- Full dark mode. All colours are CSS tokens under `.habits-theme` (`globals.css`), so nothing leaks into the prayer theme.
- Layout: phone = bottom bar + floating "+"; desktop = left sidebar, centred content column.

---

## 3b. PWA (installable, app-like)

The Habits module is a first-class PWA, installable **as its own app** next to the prayer app:

- **Own manifest** – `public/habits.webmanifest`: id `/habits`, name "Istiqamahly Habits", `start_url: /habits`, indigo theme colour, standalone display, maskable icon, and home-screen **shortcuts** (Today, Week, Tasks, Stats). Scope is `/` so the module switcher can still jump to Prayer without leaving the app window.
- **Own icons** – `public/icons/habits-*.png` (generated by `scripts/generate-habit-icons.mjs`; 192, 512, maskable 512, Apple touch 180).
- **Per-module metadata** – `src/app/habits/layout.tsx` swaps the manifest link, title, Apple web-app title/icon and `theme-color` for every `/habits` page; `viewport-fit=cover` plus safe-area insets keep the header, bottom bar and "+" button clear of notches and the home indicator.
- **Install prompt** – `InstallPrompt` shows a one-tap Install button where the browser supports it (Chrome/Edge/Android) and "Share → Add to Home Screen" instructions on iOS; hidden once installed or dismissed.
- **Offline** – service worker v2 (`public/sw.js`): precaches the offline page and icons, cache-first for hashed build assets, network-first for pages with a cached fallback, `/offline.html` for uncached navigations, never caches `/api/`. An `OfflineBadge` banner appears while disconnected. Cached pages are cleared on logout so a shared device never shows the previous user's habits.
- **Wide layout everywhere** – the desktop layout (sidebar, wide content column, floating "+") starts at 768px, so an installed desktop PWA window looks the same as the browser tab; only real phone-width windows get the bottom bar.
- **Native feel** – no rubber-band overscroll, no tap-highlight flash, no text-selection/long-press callouts on controls, no double-tap-zoom delay, 16px inputs (no iOS focus zoom), instant `loading.tsx` skeletons between pages, optimistic check-offs.

Note: check-ins and edits are server actions, so they need a connection; offline you can browse everything you've already opened.

---

## 4. Pages

| Route | What it is |
|---|---|
| `/habits` | **Today**: week strip (pick any day), progress ring, filter chips (All / Build / Break / Tasks), To-do vs Completed, family strip |
| `/habits/week` | **Weekly grid**: every habit × 7 days (done / slipped / missed / skipped), per-habit week count, day totals, week score, previous/next week |
| `/habits/tasks` | **Tasks**: One-off (Overdue / Today / Upcoming / Anytime), Recurring, Completed; add / edit / delete |
| `/habits/stats` | **Statistics**: pending-today, completion %, longest & best streaks, trend chart, build vs break, by category, "needs attention", per-habit card with heatmap |
| `/habits/manage` | **My habits**: grouped by category; edit / archive / restore / delete; category CRUD |
| `/habits/[id]` | **Habit detail**: streaks, rates, editable month calendar with notes, 26-week heatmap, weekly bars |

Global "+" creates a habit or a task.

---

## 5. Data model (all dynamic, nothing hard-coded)

Every table hangs off a `profileId` (directly or via its habit/task), the same scoping as `prayer_logs`.

```
habit_categories       (id, profileId, name, color, icon, sortOrder)        unique(profileId, name)
habits                 (id, profileId, categoryId?, name, description, kind build|break,
                        icon, color, schedule daily|weekdays|weekly_count,
                        weekdays "0,1,..", weeklyTarget, dailyTarget, unit,
                        startDate, archivedAt?, sortOrder)
habit_logs             (id, habitId, date, status done|slipped|skipped, value, note)   unique(habitId, date)
habit_tasks            (id, profileId, categoryId?, title, notes, priority, recurrence none|daily|weekly|monthly,
                        weekdays, dueDate?, completedAt?, archivedAt?)
habit_task_completions (id, taskId, date)                                   unique(taskId, date)
app_meta               (key, value)                                         one-time seed flag
```

Code map:
- `src/lib/db/schema.ts` – tables; `src/lib/db/migrate.ts` – idempotent `CREATE TABLE IF NOT EXISTS` on server start (safe for the existing VPS database, no `drizzle-kit push` needed)
- `src/lib/habits.ts` – pure logic: schedules, day states, streaks, completion rates
- `src/lib/habit-stats.ts`, `src/lib/habit-board.ts` – aggregation for charts and the Today board
- `src/lib/db/repo-habits.ts` – queries; `src/lib/habit-actions.ts` – zod-validated server actions (every mutation calls `assertOwnProfile`)
- `src/components/habits/*`, `src/app/habits/*` – UI

### Seeding Ilyas and Anis
`src/lib/habit-starter.ts` holds the starter pack: **Study, Workout (4×/week), Jog (3×/week)** as build habits and **Stop gaming, Stop doomscrolling, Stop watching TV, Stop YouTube / TikTok, Stop impulse shopping** as break habits, in four categories (Health & Fitness, Learning, Digital Detox, Mindful Spending).

On server start, `seedStarterHabitsOnce()` gives the profiles named **Ilyas** and **Anis** that pack **once** (guarded by an `app_meta` flag). After that they are ordinary rows: rename, recolour, delete or add anything. Any other profile sees a "Start with a ready-made set" button on an empty Today page instead.

---

## 6. Decisions on the open questions

- **Break habits log a success, not a miss.** Each day you tap **Clean** (or **Slipped**). A streak of "days I stayed clean" is more motivating than a list of failures, and an explicit check-in keeps the data honest (no silent auto-success). Un-logged past days count as missed.
- **Today never counts against you.** A pending today is ignored by streaks and rates until it is done.
- **"N per week" habits** measure streaks in weeks (goal met that week) and rates against `N × days/7`.
- **Skipped days** are neutral: they neither extend nor break a streak and are excluded from rates.
- **Week starts on Sunday**, matching the prayer History page.
- **Family visibility**: everyone in the household can view everyone's habits; only the owner can edit (server-enforced).

## 7. Possible next steps
Reminders/notifications, habit reordering (drag), habit templates library, sharing a habit ("we both do this"), CSV export, per-habit notes timeline.

## Habit towers (3D)
Every habit can be seen as a tower (the **Tower** tab on its page, and **/habits/towers** for all habits
side by side).
- One identical block per completed date, one floor per month, one ring of 31 date slots per floor, so a
  date always sits in the same column. Missed days are dark empty slots, skipped days are frosted, the
  current streak glows brighter, today pulses, and a beacon on top grows with everything built.
- Built entirely from your existing check-in history, so past months fill in by themselves.
- Drag to orbit, scroll to zoom, hover or tap a block for its date and status, tap a month to focus its floor.
- Drawn with instanced meshes (a few draw calls for years of history), loaded on demand, respects
  reduced motion, and falls back to a flat stack of month rows when WebGL isn't available.
- Logic in `src/lib/habit-tower.ts` (checks: `scripts/tower-check.ts`), scene in `src/components/habit-tower/`.
