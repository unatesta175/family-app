# Finance Module — Build Checklist

Couple's shared expense tracker (Ilyas + Anis). Restyled to match the reference app Belanje
(https://belanje.aizztech.com/app): light/minimal palette, left sidebar nav, dark hero account
card carousel, "coach" insight callout. Excludes Belanje's Plan & Subscriptions, Receipts,
Statement Import, Business, Loan, and Tax features — everything else in its feature set is in
scope, built on top of this module's existing Dashboard/Accounts/Transactions/Bills/Lending/
Net-worth/Settings plus new: Templates, Trips, Money Plan, Reminders.

Status: in progress.

## Restyle (visual design pass)
- [x] Light/minimal palette: white/near-white background, black primary buttons/text, thin gray
      borders instead of heavy shadows, generous whitespace — replace current teal/green
      `.finance-theme` tokens in `src/app/globals.css`
- [x] Left sidebar nav for desktop (Home, Transactions, Templates, Accounts, Trips, Budgets/Money
      Plan, Goals-equivalent n/a, Reminders, Settings) — keep bottom nav for mobile widths
- [x] Dark hero account card carousel on dashboard (swipeable, balance large, income/spending
      mini-stats on the card, bank/e-wallet icon chip) — adapt existing 3D flip account cards or
      replace with this carousel pattern on the dashboard specifically; flip cards can remain on
      the dedicated Accounts page
- [x] "Ask the coach" style insight callout on dashboard wired to the existing prediction/burn-rate
      logic (reuses `predictTomorrowSpend`/`projectRunOutDay`, not a new feature — just a new
      visual treatment for it)
- [x] Accounts page restyled: "Available funds" hero number, simple account list rows (icon, name,
      type tag, balance, "···" menu), transfers panel
- [x] Transactions page restyled: month switcher, List/Calendar view toggle, filter row
      (type/category/account/method), search bar, grouped-by-day list, Income/Spent/Net sidebar
      (List view only — Calendar view was not built, see report)

## New features (to match Belanje's scope, minus excluded items)
- [x] Templates: save a transaction as a reusable template (account, category, type, amount, note)
      for quick re-entry; `financeTemplates` table + `src/app/finance/templates/`
- [x] Trips: trip-specific budget pools with a date range and budget amount; transactions can be
      tagged to a trip; `financeTrips` table + nullable `tripId` on `financeTransactions` +
      `src/app/finance/trips/`
- [x] Money Plan: monthly envelope-style budget allocation per category (planned vs. actual spend
      per category per month); `financeMoneyPlanAllocations` table + `src/app/finance/money-plan/`
- [x] Reminders: standalone reminder list (title, due date, note, recurring, done state) separate
      from Bills; `financeReminders` table + `src/app/finance/reminders/`

## Explicitly excluded (do not build)
- [x] Plan & Subscriptions
- [x] Receipts (scanning/upload)
- [x] Statement Import
- [x] Business mode/tab
- [x] Loan tracking
- [x] Tax tracking

## Data layer (new tables, following existing profileId-FK-cascade convention)
- [x] `financeTemplates`, `financeTrips`, `financeMoneyPlanAllocations`, `financeReminders` added
      to `src/lib/db/schema.ts`
- [x] Matching `CREATE TABLE IF NOT EXISTS` DDL added to `REQUIRED_TABLES` in `src/lib/db/migrate.ts`
- [x] `tripId` nullable FK added to `financeTransactions`
- [x] Repo functions added to `src/lib/db/repo-finance.ts`; actions added to `src/lib/finance-actions.ts`

## Verification
- [x] `npx tsc --noEmit` clean
- [x] `npm run lint` clean
- [x] No other module touched or visually changed
- [x] No browser testing performed (per project convention) — static verification only
