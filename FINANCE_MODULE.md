# Finance Module — Build Checklist

Couple's shared expense tracker (Ilyas + Anis) focused on stopping overspending: daily budget
tracking, next-day spend prediction, burn-rate projection, manual (non-bank-linked) accounts
with 3D flip cards, bills, lending ledger, net worth, and shared household visibility.

Status: in progress (implemented by background agent, task a10995dc46ea1643b).

## Data layer
- [x] Schema: `financeAccounts`, `financeCategories`, `financeTransactions`, `financeBills`,
      `financeBillPayments`, `financeLending`, `financeBudgetSettings` added to `src/lib/db/schema.ts`
- [x] Runtime DDL added to `REQUIRED_TABLES` in `src/lib/db/migrate.ts` (this repo creates live
      tables via startup self-heal, not drizzle-kit push)
- [x] `src/lib/db/repo-finance.ts` — queries/mutations, starter category seeding
- [x] `src/lib/finance-actions.ts` — `"use server"` actions with zod validation

## Prediction & budget logic
- [x] Next-day prediction formula (weighted rolling average, weekday-aware, graceful fallback
      with <7 days of history)
- [x] Daily budget = monthlyIncome / days in month, with manual override
- [x] Month burn-rate projection ("run out by day X")
- [x] Days-until-payday calc from `paydayDay`

## Pages
- [x] `src/app/finance/layout.tsx` — module shell (sidebar/bottom nav, theme, viewing-partner banner)
- [x] `src/app/finance/page.tsx` — dashboard (today vs budget, prediction, burn-rate, quick add,
      recent transactions, household combined total)
- [x] `src/app/finance/accounts/` — 3D flip account cards, create/edit, icon + color theme picker
- [x] `src/app/finance/transactions/` — list, filters, add/edit/delete, shared/private toggle
- [x] `src/app/finance/bills/` — monthly recurring bills, paid/unpaid, overdue highlighting
- [x] `src/app/finance/net-worth/` — trend chart, category/account breakdown, stats, household toggle
- [x] `src/app/finance/lending/` — lent/borrowed ledger, settle action
- [x] `src/app/finance/settings/` — categories CRUD, card theme defaults (in account form), income/payday, currency

## Shared couple visibility
- [x] Reuse existing "viewing partner" read-only banner convention
- [x] Private transactions (`isShared=false`) never visible to partner
- [x] Combined household dashboard view sums both profiles' shared data

## Verification
- [x] `npx tsc --noEmit` clean
- [x] `npm run lint` clean
- [x] No browser testing performed (per project convention) — static verification only
