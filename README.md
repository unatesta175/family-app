# Istiqamahly — Multi-Module Expansion Plan

This app started as a prayer tracker (Salah logging, streaks, the 3D garden, the daily lantern).
This document plans four new modules on top of that foundation:

1. **Family Financial Tracking** — income/expense logging, budgets, shared family visibility.
2. **Habit Tracking** — build habits (Study, Gym) and break habits (stop gaming, stop TV, stop
   doomscrolling, stop YouTube/TikTok, stop shopping, stop travelling).
3. **Sunnah Practices** — sunnah prayers, fasting (Mon/Thu, White Days, etc.), Qur'an recitation,
   zikr counts.
4. **Akhlaq Tracker** — character/conduct tracking (e.g. *baik hati*, *rendah diri*, *berhenti
   mencarut*, *jaga mulut dan badan daripada melakukan perkara sia-sia*).

Each module gets its **own visual identity** (not a reskin of the prayer tracker's green theme),
its own data model, and — per the user's request — is reachable from a place other than the
existing bottom nav, which is already full.

---

## 1. How users get to these modules (navigation)

The current bottom nav (`src/components/bottom-nav.tsx`) already has 5 items — Home, Stats,
Garden, History, Settings. Mobile bottom navs stop being usable past ~5 items (cramped tap
targets, unclear icons), so the other 4 modules **should not** be jammed in as more bottom-nav
icons.

**Recommended pattern: a "Modules" hub screen**, reached via a new 6th bottom-nav
entry (icon: `LayoutGrid` from lucide-react) or a top-right icon on the Home page — a hub is the
better spot since it needs to scale past 4 modules eventually without a nav redesign every time.

- `/modules` — a grid of cards, one per module, each styled with a small preview of that module's
  own theme (so the hub itself hints at the visual identity you're about to enter): a green/gold
  prayer tile (existing app, effectively "Home"), a blue/teal finance tile, an orange/red habit
  tile, an emerald/purple sunnah tile, a warm neutral akhlaq tile.
- Tapping a card navigates into that module's own route subtree (`/finance`, `/habits`, `/sunnah`,
  `/akhlaq`), which gets its **own nested layout** (own bottom nav or tab bar, own color tokens,
  own typography feel) — Next.js App Router supports this natively via a `layout.tsx` per route
  segment, so switching modules can genuinely feel like switching apps, with a small persistent
  "back to hub" affordance (a corner icon) rather than trying to unify 5 different navigation bars
  into one.
- Home (`/`) stays the prayer tracker's front door, exactly as it is today — it's the
  highest-frequency daily action (5x/day) and shouldn't be buried a tap deeper. The hub is for
  the lower-frequency modules.

This mirrors how apps like Notion, or bank apps with multiple "spaces," handle multiple distinct
sub-products under one account: a switcher/hub screen, not one mega-nav-bar.

---

## 2. Per-module visual identity

Each module's nested layout sets its own CSS custom properties / Tailwind theme tokens (the app
already has a `globals.css` with custom keyframes per feature — same pattern, scoped per module)
so components within that route subtree pull from a different palette without touching the
prayer tracker's existing green/gold theme.

| Module | Suggested theme | Why |
|---|---|---|
| Prayer (existing) | Emerald green + gold accents, garden/nature motifs | Already built, don't touch |
| Financial | Deep blue/teal, clean SaaS-dashboard feel, charts-forward | Money apps read as trustworthy in cool tones; this module leans on `recharts` (already a dependency) more than any other |
| Habit Tracking | Warm orange/red for "break" habits, cool blue/teal for "build" habits — two-toned within one module | The build-vs-break distinction is the whole point of the module; color should carry that meaning at a glance |
| Sunnah Practices | Soft emerald/purple, calligraphic/spiritual feel, closest cousin to the prayer tracker's tone | Conceptually adjacent to prayer — should feel like a sibling, not a stranger, but still visually distinct enough to signal "different tracker" |
| Akhlaq Tracker | Warm neutral/sand tones, minimal, journal-like | Character reflection is introspective, not gamified — resist the urge to add streaks/fire emoji here; a quieter, more reflective UI fits the content |

---

## 3. Data model direction

All four modules should reuse the **existing household/profile scoping** already built for
prayer data (`profiles`, `users`, `households` in `src/lib/db/schema.ts`) — every new table gets
a `profileId` foreign key, exactly like `prayer_logs`. This is what makes family visibility work
for free: the same `assertOwnProfile` / `getProfilesInHousehold` patterns already used for prayer
data apply unchanged to money, habits, sunnah, and akhlaq data.

Sketch (final field lists TBD per module during implementation):

```
-- Financial
households already model "family"; add:
accounts        (id, profileId, name, kind: cash|bank|ewallet, balance)
transactions    (id, profileId, accountId, amount, direction: in|out, category, note, date)
budgets         (id, profileId, category, monthlyLimit)

-- Habit Tracking
habits          (id, profileId, name, kind: build|break, cadence, createdAt)
habit_logs      (id, habitId, date, done: boolean, note)

-- Sunnah Practices
sunnah_logs     (id, profileId, date, type: sunnah_prayer|fasting|quran|zikr, detail, count)

-- Akhlaq Tracker
akhlaq_traits   (id, profileId, label, isPositive: boolean)   -- e.g. "baik hati" vs "berhenti mencarut"
akhlaq_logs     (id, traitId, date, reflection: text)
```

Each module's repo functions live in their own file (`src/lib/db/repo-finance.ts`, etc.) rather
than growing the existing `repo.ts` into an unmanageable single file — `repo.ts` is already large
from the prayer/auth/household work.

---

## 4. Recommended execution order

Building all four at once is how this kind of expansion stalls. Suggested sequence:

1. **Build the `/modules` hub first**, even before any module has real content — it can launch
   with the Prayer tile live and the other three as "Coming soon" cards. This validates the
   navigation pattern early and gives you a real place to land each module as it's finished,
   instead of designing nav and module #1 simultaneously.
2. **Pick one module to fully build end-to-end before starting the next.** Recommend **Habit
   Tracking** first — it's the most self-contained (no money-handling correctness bar to clear
   like Financial, no fiqh nuance to get right like Sunnah/Akhlaq), and it validates the
   "module gets its own theme + own layout" pattern cheaply.
3. **Financial second** — highest complexity (correctness matters more with money, even
   fake/tracked money) and benefits from the routing/theming pattern already being proven out.
4. **Sunnah and Akhlaq** — content-heavy, less structurally novel once the pattern exists; these
   can likely share more plumbing with each other (both are "log a reflection/practice against a
   list of types") than with Financial or Habits.

Within each module, ship a thin vertical slice first (one table, one log action, one list view)
before adding streaks/stats/charts for that module — the prayer tracker's own history (streaks →
garden → lantern → stats pages) is itself an example of a module that grew in layers over time;
repeat that pattern deliberately instead of trying to launch each module fully-featured.

---

## 5. Open questions worth deciding before writing code

- Should Financial support multiple accounts/currencies, or start single-account/single-currency?
- For Habit Tracking, do "break" habits log a *miss* (like prayer's `missed` status) or a
  *success* (marking "didn't game today")? These read very differently in a streak UI.
- Should Sunnah fasting integrate with the existing Hijri calendar utilities (`src/lib/hijri.ts`)
  for White Days / Mon-Thu suggestions, or stay manual-entry only for v1?
- Should Akhlaq entries be private-by-default even within a household (character reflection is
  more personal than prayer completion), overriding the household-visibility default the other
  modules inherit?
