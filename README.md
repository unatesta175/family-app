# Family App

A family prayer tracker that turns each day's five prayers into a living 3D garden — grow a tree by praying on time, watch it wilt when prayers slip, and race your own streaks.

## Features

- **Prayer logging** — mark each of the five daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) with a granular status: on time + jamaah, on time, jamaah, late, qada, missed, or excused (Hayd).
- **3D garden** — every day is a plot in an interactive Three.js garden. Plots grow from seed → sprout → sapling → tree → full bloom as prayers are completed, and their color/condition (golden, thriving, healthy, stressed, wilting) reflects *how* they were prayed, not just whether they were. A day with any actively missed prayer turns into a tombstone; an all-missed day burns.
- **Streaks & tiers** — current and best streaks are tracked automatically, with bronze/silver/gold flourishes on the garden the longer a perfect streak runs.
- **Stats** — weekly, monthly, lifetime and custom-range breakdowns with charts and a calendar heatmap, plus focus-area insights on which prayer needs the most attention.
- **Challenges** — start a "no missed prayers" or "all on time" challenge for a set number of days and track progress live.
- **Qada ledger** — missed prayers are tracked so they can be logged as made up later.
- **Multiple profiles** — each family member gets their own profile, color theme, and history; switch between them from the app.
- **History & bulk editing** — review, edit, or bulk-log past days, with CSV export of your full prayer history.
- **PWA** — installable on a phone's home screen with an offline-capable service worker.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) for styling
- [Three.js](https://threejs.org) via `@react-three/fiber` and `@react-three/drei` for the 3D garden
- [Recharts](https://recharts.org) for stats charts
- [Drizzle ORM](https://orm.drizzle.team) + [libSQL](https://turso.tech/libsql) (SQLite-compatible) for persistence
- [Zod](https://zod.dev) for validation

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database

This project uses Drizzle ORM against a libSQL (SQLite) database. Configure your connection in `drizzle.config.ts` and push the schema with:

```bash
npx drizzle-kit push
```

## Project structure

```
src/
  app/
    (app)/            Authenticated app routes: home, garden, history, stats, settings, challenges
    api/               API routes (e.g. data export)
    login/             Login flow
  components/
    garden/            Garden page client component
    garden-3d/          Three.js scene, plant stages, and grid rendering
    ...                 Prayer cards, drawers, stats charts, nav, etc.
  lib/
    db/                Drizzle schema and repository functions
    garden.ts          Garden stage/condition/tier logic
    prayers.ts         Prayer metadata and status rules
    streaks.ts         Streak and completion calculations
    stats.ts           Stats aggregation
    challenge-progress.ts  Challenge evaluation
    auth.ts, session.ts    Auth/session handling
  middleware.ts        Route protection
```

## How the garden works

Each day's garden stage is driven by how many of the five prayers were performed (any non-missed, non-empty status counts, including qada and excused):

| Prayers done | Stage |
| --- | --- |
| 1/5 | Seed |
| 2/5 | Sprout |
| 3/5 | Sapling |
| 4/5 | Tree |
| 5/5 | Full bloom |

A day's **condition** (golden / thriving / healthy / stressed / wilting) is a separate quality score based on *how* each prayer was performed — on time and in jamaah scores highest, qada scores lowest. Any actively missed prayer overrides growth entirely: one missed prayer tombstones the plot, and five missed prayers burns it.

## License

Private project — not licensed for redistribution.
