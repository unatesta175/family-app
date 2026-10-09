# Family App

A family prayer tracker that turns each day's five prayers into a living 3D garden. Grow a tree by praying on time, watch it wilt when prayers slip, and race your own streaks.

## Core Features

* **Prayer logging**: mark each of the five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) with a granular status such as on time plus jamaah, on time, jamaah, late, qada, missed, or excused (Hayd).
* **3D garden**: every day is a plot in an interactive Three.js garden. Plots grow from seed to sprout to sapling to tree to full bloom as prayers are completed, and their color and condition (golden, thriving, healthy, stressed, wilting) reflect how they were prayed, not just whether they were. A day with any actively missed prayer turns into a tombstone, and an all missed day burns.
* **Streaks and tiers**: current and best streaks are tracked automatically, with bronze, silver, and gold flourishes on the garden the longer a perfect streak runs.
* **Stats**: weekly, monthly, lifetime, and custom range breakdowns with charts and a calendar heatmap, plus focus area insights on which prayer needs the most attention.
* **Islamic calendar & events**: an offline Hijri layer surfaces the day's sacred days and recommended observances — Ramadan (with a progress strip), Jummah, Eid al-Fitr and Eid al-Adha, the Day of Arafah, Ashura, the first ten of Dhul-Hijjah, the Islamic New Year, and the white days (Ayyam al-Beed) — plus a countdown to what's coming up. Fasting days are flagged, and days where fasting is forbidden (the Eids, Tashriq) are marked so nudges never contradict the fiqh.
* **Prayer reminders (Web Push)**: opt-in push notifications at each prayer time (optionally a few minutes before), a follow-up nudge if a prayer is still unlogged, per-prayer toggles, and quiet hours — delivered in each person's own timezone, even when the app is closed.
* **Challenges**: start a "no missed prayers" or "all on time" challenge for a set number of days and track progress live.
* **Qada ledger**: missed prayers are tracked so they can be logged as made up later.
* **Multiple profiles**: each family member gets their own profile, color theme, and history, and can switch between them from the app.
* **History and bulk editing**: review, edit, or bulk log past days, with CSV export of your full prayer history.
* **PWA support**: installable on a phone's home screen with an offline capable service worker.

## Tech Stack, Frameworks, Tools, and Libraries

* [Next.js](https://nextjs.org) using the App Router, as the core framework
* [React 19](https://react.dev) for the UI layer
* [TypeScript](https://www.typescriptlang.org) for type safety across the app
* [Tailwind CSS v4](https://tailwindcss.com) for styling
* [Three.js](https://threejs.org) for 3D rendering of the garden
* `@react-three/fiber` and `@react-three/drei` as React bindings and helpers for Three.js
* [Recharts](https://recharts.org) for stats charts
* [Drizzle ORM](https://orm.drizzle.team) as the database toolkit and query builder
* [libSQL](https://turso.tech/libsql), a SQLite compatible database, for persistence
* `drizzle-kit` for schema migrations
* [Zod](https://zod.dev) for schema validation
* [Lucide](https://lucide.dev) for icons
* [ESLint](https://eslint.org) for linting

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

This project uses Drizzle ORM against a libSQL (SQLite) database. Configure your connection in `drizzle.config.ts`, then push the schema with:

```bash
npx drizzle-kit push
```

## Project Structure

```
src/
  app/
    (app)/              authenticated app routes: home, garden, history, stats, settings, challenges
    api/                 API routes such as data export
    login/               login flow
  components/
    garden/              garden page client component
    garden 3d/            Three.js scene, plant stages, and grid rendering
    ...                   prayer cards, drawers, stats charts, nav, and more
  lib/
    db/                  Drizzle schema and repository functions
    garden.ts            garden stage, condition, and tier logic
    prayers.ts           prayer metadata and status rules
    streaks.ts           streak and completion calculations
    stats.ts             stats aggregation
    challenge progress.ts  challenge evaluation
    auth.ts, session.ts    auth and session handling
  middleware.ts          route protection
```

## How the Garden Works

Each day's garden stage is driven by how many of the five prayers were performed. Any status other than missed or empty counts, including qada and excused:

1. One of five prayers done grows a seed.
2. Two of five prayers done grows a sprout.
3. Three of five prayers done grows a sapling.
4. Four of five prayers done grows a tree.
5. Five of five prayers done grows a full bloom.

A day's condition, shown as golden, thriving, healthy, stressed, or wilting, is a separate quality score based on how each prayer was performed. Praying on time and in jamaah scores highest, while qada scores lowest. Any actively missed prayer overrides growth entirely: one missed prayer turns the plot into a tombstone, and five missed prayers burns it.

## Testing

Fast, dependency-free sanity suites guard the correctness-critical pure logic (the kind that regresses silently):

```bash
npm run check          # runs every suite below
npx tsx scripts/prayer-logic-check.ts      # performed/excused(Hayd)/qada rules, quality scale, streaks
npx tsx scripts/islamic-events-check.ts    # Hijri conversion + sacred-day/fasting detection
npx tsx scripts/reminder-check.ts          # prayer-reminder timing (lead, follow-up, quiet hours, dedup)
npx tsx scripts/focus-check.ts             # Focus module timing and totals
```

These run in CI on every push and pull request (`.github/workflows/ci.yml`), alongside `npm run lint` and `tsc --noEmit`, so a broken streak, a mis-scored status, or a reminder firing at the wrong minute fails the build before it can merge.

## Roadmap

Enterprise-grade improvements, implemented one at a time:

* [x] **Prayer reminders & notification engine** — Web Push at prayer times with lead/follow-up nudges, quiet hours, timezone-aware delivery, and an in-process scheduler (plus a cron backstop).
* [x] **Hijri calendar + Islamic-events engine** — Ramadan awareness, Jummah, the two Eids, Arafah, Ashura, the first ten of Dhul-Hijjah, and the white days, with a countdown card and fasting-day flags. Foundation for Ramadan streaks and seasonal reminders.
* [x] **Automated tests on religiously-sensitive logic + CI** — unit coverage for the excused/qada/streak/quality maths, plus a GitHub Actions pipeline gating `lint` + `tsc` + `npm run check` on every push and PR, so a trust-breaking regression (e.g. counting Hayd as a lapse) can't merge.
* [ ] **Contextual challenges & seasonal reminders** — Ramadan streaks and Ayyam al-Beed fasting challenges built on the events engine.
* [~] **Offline-first sync** — the decision core is built and unit-tested (`lib/offline-sync.ts`: an offline-edit queue, coalescing, last-write-wins conflict resolution, optimistic view, and acknowledgement). The remaining service-worker wiring that captures edits while offline and replays them on reconnect is deliberately deferred until it can be verified on a real device, since getting replay wrong risks data loss.
* [x] **Deeper, proactive analytics** — a prioritised insights engine on the Stats page: streak-at-risk warnings, your weakest prayer and hardest weekday, a qada burn-down plan, and momentum encouragement. *(Family dashboard still to come.)*

## License

Private project, not licensed for redistribution.
