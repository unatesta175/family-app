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

## Overspending-control pass: 5 predictive insights + 5 SaaS features
All algorithm-based (weighted/moving averages, pattern detection) — explicitly NO ML/model
training/external AI calls. Pure functions in `repo-finance.ts`, unit-testable, graceful fallback
with insufficient history (same convention as the existing `predictTomorrowSpend`).

### 5 predictive/analytical insights
- [x] 1. Next-day spend prediction (already exists: `predictTomorrowSpend` — surface it more
      prominently if not already primary on the dashboard; no change needed if already there)
- [x] 2. Month-end burn-rate / run-out-day projection (already exists: `projectRunOutDay` —
      same, confirm prominence only)
- [x] 3. Day-of-week spending pattern ("You spend ~2x more on Fridays than your daily average") —
      new: average spend per weekday over trailing N weeks, flag weekdays that are
      significantly (e.g. >30%) above the overall daily average
- [x] 4. Category spend trend (this month vs last month per category, % change, flag categories
      trending up) — new: `getCategoryTrends(profileId, month)` 
- [x] 5. Projected month-end savings/shortfall (if current pace continues: income − projected
      total spend = projected leftover, negative = projected shortfall before payday) — new,
      builds on `projectRunOutDay`'s daily-average logic

### 5 SaaS features to prevent overspending
- [x] 1. "Safe to spend today" indicator — daily budget minus today's spend minus a reserve for
      upcoming unpaid bills/reminders due before payday, shown prominently on dashboard (bigger/
      more prominent than the existing today-vs-budget bar; this is the actionable number)
- [x] 2. Adaptive daily budget with rollover — underspend today increases tomorrow's allowance,
      overspend shrinks it, recalculated from remaining days to payday and remaining budget
      (new setting/toggle in Budget Settings: "Adaptive daily budget" on/off, off = current flat
      monthlyIncome/daysInMonth behavior)
- [x] 3. Per-category budget caps with progress bars — optional monthly cap per category
      (extend `financeCategories` or `financeMoneyPlanAllocations`, reuse Money Plan's existing
      planned-amount field if it already fits rather than adding a new table), visual progress
      bar + red state when over, shown on a Budgets/Money Plan summary and as a small badge
      wherever that category is used
- [x] 4. Overspend push alert — the moment today's spend crosses the daily budget (or the
      adaptive one), send a push notification via the existing `web-push` infra (same pattern as
      `src/app/api/cron/prayer-reminders`); add a `src/app/api/cron/finance-overspend-check`
      route or fold into a new cron route, idempotent per day/profile like `notification_sends`
- [x] 5. Weekly spending digest card — in-app dashboard card (not email) summarizing the past 7
      days: total spent, vs. previous 7 days (% change), top category, days over budget — shown
      on the dashboard, no new page required

### Data layer for this pass
- [x] Any new fields/tables needed (e.g. adaptive-budget toggle on `financeBudgetSettings`,
      category cap field) added to `schema.ts` + `REQUIRED_TABLES`/`REQUIRED_COLUMNS` in
      `migrate.ts`
- [x] New pure prediction/analytics functions in `repo-finance.ts`
- [x] New actions in `finance-actions.ts` as needed (e.g. toggling adaptive budget)

### Verification
- [x] `npx tsc --noEmit` clean
- [x] `npm run lint` clean
- [x] No other module touched
- [x] No browser testing performed — static verification only
