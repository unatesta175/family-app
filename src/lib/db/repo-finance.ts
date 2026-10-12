import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  financeAccounts,
  financeBillPayments,
  financeBills,
  financeBudgetSettings,
  financeCategories,
  financeLending,
  financeMoneyPlanAllocations,
  financeOverspendAlerts,
  financeReminders,
  financeTemplates,
  financeTransactions,
  financeTrips,
  profiles,
} from "@/lib/db/schema";
import type {
  FinanceAccountType,
  FinanceCardTheme,
  FinanceCategoryGroup,
  FinanceLendDirection,
  FinanceLendStatus,
  FinanceTxType,
} from "@/lib/db/schema";

export type AccountRow = typeof financeAccounts.$inferSelect;
export type CategoryRow = typeof financeCategories.$inferSelect;
export type TransactionRow = typeof financeTransactions.$inferSelect;
export type BillRow = typeof financeBills.$inferSelect;
export type BillPaymentRow = typeof financeBillPayments.$inferSelect;
export type LendingRow = typeof financeLending.$inferSelect;
export type BudgetSettingsRow = typeof financeBudgetSettings.$inferSelect;
export type TripRow = typeof financeTrips.$inferSelect;
export type TemplateRow = typeof financeTemplates.$inferSelect;
export type MoneyPlanAllocationRow = typeof financeMoneyPlanAllocations.$inferSelect;
export type ReminderRow = typeof financeReminders.$inferSelect;

const SEED_FLAG = "finance_categories_seed_v1";

export const STARTER_CATEGORIES: { name: string; icon: string; color: string; group: FinanceCategoryGroup }[] = [
  { name: "Food", icon: "utensils", color: "amber", group: "need" },
  { name: "Transport", icon: "car", color: "sky", group: "need" },
  { name: "Bills", icon: "receipt", color: "rose", group: "need" },
  { name: "Groceries", icon: "shopping-basket", color: "emerald", group: "need" },
  { name: "Shopping", icon: "shopping-bag", color: "violet", group: "want" },
  { name: "Entertainment", icon: "clapperboard", color: "pink", group: "want" },
  { name: "Health", icon: "heart-pulse", color: "red", group: "need" },
  { name: "Savings", icon: "piggy-bank", color: "teal", group: "need" },
  { name: "Other", icon: "circle-ellipsis", color: "slate", group: "want" },
];

/** One-time starter category set per profile, mirroring the habits starter-pack convention. */
export async function seedStarterFinanceCategoriesOnce() {
  const flagRes = await db.$client.execute({ sql: "SELECT value FROM app_meta WHERE key = ?", args: [SEED_FLAG] });
  if (flagRes.rows.length > 0) return;

  const seedNames = ["ilyas", "anis"];
  const allProfiles = await db.select().from(profiles);
  const targets = allProfiles.filter((p) => seedNames.includes(p.name.trim().toLowerCase()));
  if (targets.length === 0) return;

  for (const p of targets) {
    const existing = await db.select({ id: financeCategories.id }).from(financeCategories).where(eq(financeCategories.profileId, p.id)).limit(1);
    if (existing.length > 0) continue;
    await seedCategoriesForProfile(p.id);
  }
  await db.$client.execute({ sql: "INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)", args: [SEED_FLAG, "1"] });
}

/** Seeds the starter category set for a single profile (also used the first time anyone opens Finance). */
export async function seedCategoriesForProfile(profileId: number) {
  const existing = await db.select({ id: financeCategories.id }).from(financeCategories).where(eq(financeCategories.profileId, profileId)).limit(1);
  if (existing.length > 0) return;
  await db.insert(financeCategories).values(
    STARTER_CATEGORIES.map((c, i) => ({ profileId, name: c.name, icon: c.icon, color: c.color, group: c.group, sortOrder: i }))
  );
}

// --- Accounts ----------------------------------------------------------------------------------

export async function getAccountsByProfiles(profileIds: number[]): Promise<AccountRow[]> {
  if (profileIds.length === 0) return [];
  return db
    .select()
    .from(financeAccounts)
    .where(inArray(financeAccounts.profileId, profileIds))
    .orderBy(asc(financeAccounts.sortOrder), asc(financeAccounts.id));
}

export async function getAccount(id: number): Promise<AccountRow | null> {
  const [row] = await db.select().from(financeAccounts).where(eq(financeAccounts.id, id));
  return row ?? null;
}

export type AccountInput = {
  name: string;
  type: FinanceAccountType;
  icon: string;
  colorTheme: FinanceCardTheme;
  balance: number;
  isShared: boolean;
};

export async function createAccount(profileId: number, input: AccountInput): Promise<AccountRow> {
  const [max] = await db
    .select({ max: sql<number>`coalesce(max(${financeAccounts.sortOrder}), -1)` })
    .from(financeAccounts)
    .where(eq(financeAccounts.profileId, profileId));
  const [row] = await db
    .insert(financeAccounts)
    .values({ profileId, ...input, sortOrder: (max?.max ?? -1) + 1 })
    .returning();
  return row;
}

export async function updateAccount(id: number, input: AccountInput) {
  await db.update(financeAccounts).set(input).where(eq(financeAccounts.id, id));
}

export async function archiveAccount(id: number) {
  await db.update(financeAccounts).set({ archivedAt: sql`(current_timestamp)` }).where(eq(financeAccounts.id, id));
}

export async function deleteAccount(id: number) {
  await db.delete(financeAccounts).where(eq(financeAccounts.id, id));
}

// --- Categories ----------------------------------------------------------------------------------

export async function getCategoriesByProfile(profileId: number): Promise<CategoryRow[]> {
  return db.select().from(financeCategories).where(eq(financeCategories.profileId, profileId)).orderBy(asc(financeCategories.sortOrder), asc(financeCategories.id));
}

export async function getCategoriesByProfiles(profileIds: number[]): Promise<CategoryRow[]> {
  if (profileIds.length === 0) return [];
  return db.select().from(financeCategories).where(inArray(financeCategories.profileId, profileIds)).orderBy(asc(financeCategories.sortOrder));
}

export type CategoryInput = { name: string; icon: string; color: string; group: FinanceCategoryGroup };

export async function createCategory(profileId: number, input: CategoryInput): Promise<CategoryRow> {
  const [max] = await db
    .select({ max: sql<number>`coalesce(max(${financeCategories.sortOrder}), -1)` })
    .from(financeCategories)
    .where(eq(financeCategories.profileId, profileId));
  const [row] = await db.insert(financeCategories).values({ profileId, ...input, sortOrder: (max?.max ?? -1) + 1 }).returning();
  return row;
}

export async function updateCategory(id: number, input: CategoryInput) {
  await db.update(financeCategories).set(input).where(eq(financeCategories.id, id));
}

export async function deleteCategory(id: number) {
  await db.delete(financeCategories).where(eq(financeCategories.id, id));
}

export async function getCategory(id: number): Promise<CategoryRow | null> {
  const [row] = await db.select().from(financeCategories).where(eq(financeCategories.id, id));
  return row ?? null;
}

// --- Transactions --------------------------------------------------------------------------------

export type TransactionFilters = {
  accountId?: number;
  categoryId?: number;
  type?: FinanceTxType;
  from?: string;
  to?: string;
};

export async function getTransactionsByProfiles(profileIds: number[], filters: TransactionFilters = {}): Promise<TransactionRow[]> {
  if (profileIds.length === 0) return [];
  const conditions = [inArray(financeTransactions.profileId, profileIds)];
  if (filters.accountId) conditions.push(eq(financeTransactions.accountId, filters.accountId));
  if (filters.categoryId) conditions.push(eq(financeTransactions.categoryId, filters.categoryId));
  if (filters.type) conditions.push(eq(financeTransactions.type, filters.type));
  if (filters.from) conditions.push(gte(financeTransactions.date, filters.from));
  if (filters.to) conditions.push(lte(financeTransactions.date, filters.to));
  return db
    .select()
    .from(financeTransactions)
    .where(and(...conditions))
    .orderBy(desc(financeTransactions.date), desc(financeTransactions.id));
}

export async function getTransaction(id: number): Promise<TransactionRow | null> {
  const [row] = await db.select().from(financeTransactions).where(eq(financeTransactions.id, id));
  return row ?? null;
}

export type TransactionInput = {
  accountId: number;
  categoryId: number | null;
  tripId?: number | null;
  type: FinanceTxType;
  amount: number;
  note: string | null;
  date: string;
  isShared: boolean;
};

export async function createTransaction(profileId: number, input: TransactionInput): Promise<TransactionRow> {
  const [row] = await db.insert(financeTransactions).values({ profileId, ...input }).returning();
  await applyBalanceDelta(input.accountId, input.type, input.amount);
  return row;
}

export async function updateTransaction(id: number, input: TransactionInput) {
  const existing = await getTransaction(id);
  if (!existing) throw new Error("Transaction not found.");
  // Reverse the old effect, apply the new one (handles account/amount/type changes cleanly).
  await applyBalanceDelta(existing.accountId, existing.type, -existing.amount);
  await db.update(financeTransactions).set(input).where(eq(financeTransactions.id, id));
  await applyBalanceDelta(input.accountId, input.type, input.amount);
}

export async function deleteTransaction(id: number) {
  const existing = await getTransaction(id);
  if (!existing) return;
  await applyBalanceDelta(existing.accountId, existing.type, -existing.amount);
  await db.delete(financeTransactions).where(eq(financeTransactions.id, id));
}

async function applyBalanceDelta(accountId: number, type: FinanceTxType, amount: number) {
  const signed = type === "expense" ? -amount : amount;
  await db
    .update(financeAccounts)
    .set({ balance: sql`${financeAccounts.balance} + ${signed}` })
    .where(eq(financeAccounts.id, accountId));
}

/** A transfer between two of the same profile's accounts: an expense leg + a matching income leg, both type "transfer" so they're excluded from spend/income totals but update balances. */
export async function createTransfer(
  profileId: number,
  input: { fromAccountId: number; toAccountId: number; amount: number; date: string; note: string | null }
): Promise<{ from: TransactionRow; to: TransactionRow }> {
  const [from] = await db
    .insert(financeTransactions)
    .values({
      profileId,
      accountId: input.fromAccountId,
      categoryId: null,
      tripId: null,
      type: "transfer",
      amount: input.amount,
      note: input.note,
      date: input.date,
      isShared: false,
    })
    .returning();
  const [to] = await db
    .insert(financeTransactions)
    .values({
      profileId,
      accountId: input.toAccountId,
      categoryId: null,
      tripId: null,
      type: "transfer",
      amount: input.amount,
      note: input.note,
      date: input.date,
      isShared: false,
    })
    .returning();
  // Transfer legs net out of the originating account and into the destination account.
  await db.update(financeAccounts).set({ balance: sql`${financeAccounts.balance} - ${input.amount}` }).where(eq(financeAccounts.id, input.fromAccountId));
  await db.update(financeAccounts).set({ balance: sql`${financeAccounts.balance} + ${input.amount}` }).where(eq(financeAccounts.id, input.toAccountId));
  return { from, to };
}

// --- Bills -----------------------------------------------------------------------------------

export async function getBillsByProfile(profileId: number): Promise<BillRow[]> {
  return db.select().from(financeBills).where(eq(financeBills.profileId, profileId)).orderBy(asc(financeBills.dueDay));
}

export async function getBill(id: number): Promise<BillRow | null> {
  const [row] = await db.select().from(financeBills).where(eq(financeBills.id, id));
  return row ?? null;
}

export type BillInput = { name: string; amount: number; dueDay: number; categoryId: number | null; recurring: boolean };

export async function createBill(profileId: number, input: BillInput): Promise<BillRow> {
  const [row] = await db.insert(financeBills).values({ profileId, ...input }).returning();
  return row;
}

export async function updateBill(id: number, input: BillInput) {
  await db.update(financeBills).set(input).where(eq(financeBills.id, id));
}

export async function archiveBill(id: number) {
  await db.update(financeBills).set({ archivedAt: sql`(current_timestamp)` }).where(eq(financeBills.id, id));
}

export async function deleteBill(id: number) {
  await db.delete(financeBills).where(eq(financeBills.id, id));
}

export async function getBillPayments(billIds: number[]): Promise<BillPaymentRow[]> {
  if (billIds.length === 0) return [];
  return db.select().from(financeBillPayments).where(inArray(financeBillPayments.billId, billIds));
}

export async function markBillPaid(billId: number, month: string, amountPaid: number) {
  await db
    .insert(financeBillPayments)
    .values({ billId, month, paidAt: sql`(current_timestamp)`, amountPaid })
    .onConflictDoUpdate({ target: [financeBillPayments.billId, financeBillPayments.month], set: { paidAt: sql`(current_timestamp)`, amountPaid } });
}

export async function markBillUnpaid(billId: number, month: string) {
  await db.delete(financeBillPayments).where(and(eq(financeBillPayments.billId, billId), eq(financeBillPayments.month, month)));
}

// --- Lending -----------------------------------------------------------------------------------

export async function getLendingByProfile(profileId: number): Promise<LendingRow[]> {
  return db.select().from(financeLending).where(eq(financeLending.profileId, profileId)).orderBy(desc(financeLending.createdAt), desc(financeLending.id));
}

export async function getLendingEntry(id: number): Promise<LendingRow | null> {
  const [row] = await db.select().from(financeLending).where(eq(financeLending.id, id));
  return row ?? null;
}

export type LendingInput = {
  counterpartyName: string;
  direction: FinanceLendDirection;
  amount: number;
  note: string | null;
  dueDate: string | null;
};

export async function createLending(profileId: number, input: LendingInput): Promise<LendingRow> {
  const [row] = await db.insert(financeLending).values({ profileId, ...input, status: "open" }).returning();
  return row;
}

export async function updateLending(id: number, input: LendingInput) {
  await db.update(financeLending).set(input).where(eq(financeLending.id, id));
}

export async function setLendingStatus(id: number, status: FinanceLendStatus) {
  await db
    .update(financeLending)
    .set({ status, settledAt: status === "settled" ? sql`(current_timestamp)` : null })
    .where(eq(financeLending.id, id));
}

export async function deleteLending(id: number) {
  await db.delete(financeLending).where(eq(financeLending.id, id));
}

// --- Budget settings -------------------------------------------------------------------------

export async function getBudgetSettings(profileId: number): Promise<BudgetSettingsRow | null> {
  const [row] = await db.select().from(financeBudgetSettings).where(eq(financeBudgetSettings.profileId, profileId));
  return row ?? null;
}

export type BudgetSettingsInput = {
  monthlyIncome: number;
  paydayDay: number;
  dailyBudgetOverride: number | null;
  adaptiveBudget: boolean;
};

export async function upsertBudgetSettings(profileId: number, input: BudgetSettingsInput) {
  await db
    .insert(financeBudgetSettings)
    .values({ profileId, ...input, updatedAt: sql`(current_timestamp)` })
    .onConflictDoUpdate({ target: financeBudgetSettings.profileId, set: { ...input, updatedAt: sql`(current_timestamp)` } });
}

// --- Prediction & budget math (pure functions, unit-testable) ---------------------------------

/** How many days the given yyyy-mm has. */
export function daysInMonth(yyyyMm: string): number {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** The daily budget: the manual override if set, else monthlyIncome / days-in-current-month. */
export function computeDailyBudget(monthlyIncome: number, dailyBudgetOverride: number | null, today: string): number {
  if (dailyBudgetOverride !== null && dailyBudgetOverride > 0) return dailyBudgetOverride;
  const dim = daysInMonth(today.slice(0, 7));
  return dim > 0 ? monthlyIncome / dim : 0;
}

/** Days from `today` (yyyy-mm-dd) to the next occurrence of `paydayDay` (1-31), inclusive-of-today = 0. */
export function daysUntilPayday(paydayDay: number, today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const clampDay = (year: number, month: number) => {
    const dim = new Date(year, month, 0).getDate();
    return Math.min(paydayDay, dim);
  };
  const thisMonthPayday = clampDay(y, m);
  if (thisMonthPayday >= d) {
    return thisMonthPayday - d;
  }
  // Next month's payday.
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const nextPayday = clampDay(nextYear, nextMonth);
  const daysLeftThisMonth = daysInMonth(today.slice(0, 7)) - d;
  return daysLeftThisMonth + nextPayday;
}

export type DaySpend = { date: string; amount: number };

/**
 * Predicted tomorrow's spend: 0.5 * avg(last 7 days, same weekday as tomorrow) + 0.3 * avg(last
 * 14 days overall) + 0.2 * avg(last 30 days overall). Clamped to >= 0. Falls back to a simple
 * average of whatever history exists once there's fewer than 7 days of data, and to 0 ("not
 * enough data yet") when there's no history at all.
 */
export function predictTomorrowSpend(history: DaySpend[], tomorrow: string): { amount: number; confident: boolean } {
  if (history.length === 0) return { amount: 0, confident: false };

  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1)); // most recent first
  const tomorrowWeekday = new Date(tomorrow).getDay();

  const last7 = sorted.slice(0, 7);
  const last14 = sorted.slice(0, 14);
  const last30 = sorted.slice(0, 30);

  const avg = (rows: DaySpend[]) => (rows.length ? rows.reduce((a, r) => a + r.amount, 0) / rows.length : 0);

  if (sorted.length < 7) {
    return { amount: Math.max(0, avg(sorted)), confident: false };
  }

  const sameWeekday = last7.filter((r) => new Date(r.date).getDay() === tomorrowWeekday);
  const weekdayAvg = sameWeekday.length ? avg(sameWeekday) : avg(last7);

  const amount = 0.5 * weekdayAvg + 0.3 * avg(last14) + 0.2 * avg(last30);
  return { amount: Math.max(0, amount), confident: true };
}

/** Day-of-month the burn rate projects you'll hit zero remaining budget, or null if you won't. */
export function projectRunOutDay(monthlyIncome: number, spentSoFar: number, currentDay: number, dim: number): number | null {
  if (monthlyIncome <= 0) return null;
  const avgDailySpend = currentDay > 0 ? spentSoFar / currentDay : 0;
  if (avgDailySpend <= 0) return null;
  const remaining = monthlyIncome - spentSoFar;
  if (remaining <= 0) return currentDay;
  const daysLeft = remaining / avgDailySpend;
  const runOutDay = currentDay + daysLeft;
  return runOutDay <= dim ? Math.ceil(runOutDay) : null;
}

/**
 * Day-of-week spending pattern: average expense per weekday across whatever history is passed in
 * (callers typically pass ~8 weeks). A weekday is flagged when its average is >30% above the
 * overall daily average, and at least 2 data points exist for it (avoids flagging off one outlier).
 * Graceful with no history: returns [].
 */
export type WeekdaySpend = { weekday: number; avg: number; count: number; flagged: boolean };

export function getWeekdaySpendPattern(history: DaySpend[]): WeekdaySpend[] {
  if (history.length === 0) return [];
  const overallAvg = history.reduce((s, r) => s + r.amount, 0) / history.length;
  const byWeekday = new Map<number, number[]>();
  for (const r of history) {
    const wd = new Date(r.date).getDay();
    const arr = byWeekday.get(wd) ?? [];
    arr.push(r.amount);
    byWeekday.set(wd, arr);
  }
  const result: WeekdaySpend[] = [];
  for (let wd = 0; wd < 7; wd++) {
    const amounts = byWeekday.get(wd) ?? [];
    const avg = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const flagged = overallAvg > 0 && amounts.length >= 2 && avg > overallAvg * 1.3;
    result.push({ weekday: wd, avg, count: amounts.length, flagged });
  }
  return result;
}

/**
 * This month vs last month spend per category, with % change and an "up" flag (>20% increase).
 * `pctChange` is null when there was no spend last month to compare against (can't express a %).
 */
export type CategoryTrend = { categoryId: number; thisMonth: number; lastMonth: number; pctChange: number | null; trendingUp: boolean };

export async function getCategoryTrends(profileId: number, month: string): Promise<CategoryTrend[]> {
  const [y, m] = month.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1); // m is 1-indexed; month-2 index = previous month
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const [thisMap, lastMap] = await Promise.all([getActualSpendByCategory(profileId, month), getActualSpendByCategory(profileId, prevMonth)]);
  const categoryIds = new Set([...thisMap.keys(), ...lastMap.keys()]);
  return [...categoryIds].map((categoryId) => {
    const thisMonthAmt = thisMap.get(categoryId) ?? 0;
    const lastMonthAmt = lastMap.get(categoryId) ?? 0;
    const pctChange = lastMonthAmt > 0 ? ((thisMonthAmt - lastMonthAmt) / lastMonthAmt) * 100 : null;
    return { categoryId, thisMonth: thisMonthAmt, lastMonth: lastMonthAmt, pctChange, trendingUp: pctChange !== null && pctChange > 20 };
  });
}

/**
 * If current pace continues: income − projected total spend (avg daily spend so far × days in
 * month) = projected leftover. Negative = projected shortfall before payday/month-end.
 */
export function projectMonthEndSavings(monthlyIncome: number, spentSoFar: number, currentDay: number, dim: number): number | null {
  if (monthlyIncome <= 0 || currentDay <= 0) return null;
  const avgDailySpend = spentSoFar / currentDay;
  const projectedTotal = avgDailySpend * dim;
  return monthlyIncome - projectedTotal;
}

/**
 * Adaptive daily budget: remaining monthly budget / remaining days to payday (including today).
 * Recalculated fresh each day from actual spend so far, so under/overspending shifts tomorrow's
 * number automatically. Floors at 0 (never negative).
 */
export function computeAdaptiveDailyBudget(monthlyIncome: number, spentThisMonth: number, remainingDaysToPayday: number): number {
  if (monthlyIncome <= 0) return 0;
  const remainingBudget = monthlyIncome - spentThisMonth;
  if (remainingDaysToPayday <= 0) return Math.max(0, remainingBudget);
  return Math.max(0, remainingBudget / remainingDaysToPayday);
}

/**
 * "Safe to spend today" = daily budget minus what's already spent today minus a reserve set aside
 * for upcoming unpaid bills due before payday (spread evenly over the remaining days, not
 * subtracted as one lump, so it reads as a sane daily number). Can go negative (already over).
 */
export function computeSafeToSpendToday(dailyBudget: number, todaySpend: number, dailyReserveForBills: number): number {
  return dailyBudget - todaySpend - dailyReserveForBills;
}

/**
 * Past 7 days vs the previous 7 days: total spend, % change (null if nothing to compare against),
 * the category spent most on this week, and how many of the last 7 days went over the daily budget.
 */
export type WeeklyDigest = {
  thisWeekTotal: number;
  lastWeekTotal: number;
  pctChange: number | null;
  topCategoryId: number | null;
  daysOverBudget: number;
};

function shiftIsoDate(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function computeWeeklyDigest(
  expenses: { date: string; amount: number; categoryId: number | null }[],
  today: string,
  dailyBudget: number
): WeeklyDigest {
  const weekStart = shiftIsoDate(today, -6);
  const prevWeekEnd = shiftIsoDate(today, -7);
  const prevWeekStart = shiftIsoDate(today, -13);

  const thisWeek = expenses.filter((e) => e.date >= weekStart && e.date <= today);
  const lastWeek = expenses.filter((e) => e.date >= prevWeekStart && e.date <= prevWeekEnd);

  const thisWeekTotal = thisWeek.reduce((s, e) => s + e.amount, 0);
  const lastWeekTotal = lastWeek.reduce((s, e) => s + e.amount, 0);
  const pctChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : null;

  const byCategory = new Map<number, number>();
  for (const e of thisWeek) {
    if (e.categoryId === null) continue;
    byCategory.set(e.categoryId, (byCategory.get(e.categoryId) ?? 0) + e.amount);
  }
  let topCategoryId: number | null = null;
  let topAmount = 0;
  for (const [categoryId, amount] of byCategory) {
    if (amount > topAmount) {
      topAmount = amount;
      topCategoryId = categoryId;
    }
  }

  const byDate = new Map<string, number>();
  for (const e of thisWeek) byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount);
  const daysOverBudget = dailyBudget > 0 ? [...byDate.values()].filter((v) => v > dailyBudget).length : 0;

  return { thisWeekTotal, lastWeekTotal, pctChange, topCategoryId, daysOverBudget };
}

// --- Overspend push alerts (idempotency log) --------------------------------------------------

/**
 * Claims today's overspend-alert slot for a profile. The unique index makes this idempotent: a
 * second call for the same (profile, date) returns false, so the cron never double-sends in a day.
 */
export async function claimOverspendAlertSlot(profileId: number, date: string): Promise<boolean> {
  const res = await db
    .insert(financeOverspendAlerts)
    .values({ profileId, date })
    .onConflictDoNothing()
    .returning({ id: financeOverspendAlerts.id });
  return res.length > 0;
}

// --- Templates (quick re-entry) ----------------------------------------------------------------

export async function getTemplatesByProfile(profileId: number): Promise<TemplateRow[]> {
  return db.select().from(financeTemplates).where(eq(financeTemplates.profileId, profileId)).orderBy(asc(financeTemplates.sortOrder), asc(financeTemplates.id));
}

export async function getTemplate(id: number): Promise<TemplateRow | null> {
  const [row] = await db.select().from(financeTemplates).where(eq(financeTemplates.id, id));
  return row ?? null;
}

export type TemplateInput = {
  name: string;
  accountId: number;
  categoryId: number | null;
  type: FinanceTxType;
  amount: number;
  note: string | null;
};

export async function createTemplate(profileId: number, input: TemplateInput): Promise<TemplateRow> {
  const [max] = await db
    .select({ max: sql<number>`coalesce(max(${financeTemplates.sortOrder}), -1)` })
    .from(financeTemplates)
    .where(eq(financeTemplates.profileId, profileId));
  const [row] = await db.insert(financeTemplates).values({ profileId, ...input, sortOrder: (max?.max ?? -1) + 1 }).returning();
  return row;
}

export async function updateTemplate(id: number, input: TemplateInput) {
  await db.update(financeTemplates).set(input).where(eq(financeTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  await db.delete(financeTemplates).where(eq(financeTemplates.id, id));
}

// --- Trips ----------------------------------------------------------------------------------

export async function getTripsByProfile(profileId: number): Promise<TripRow[]> {
  return db.select().from(financeTrips).where(eq(financeTrips.profileId, profileId)).orderBy(desc(financeTrips.startDate), desc(financeTrips.id));
}

export async function getTrip(id: number): Promise<TripRow | null> {
  const [row] = await db.select().from(financeTrips).where(eq(financeTrips.id, id));
  return row ?? null;
}

export type TripInput = { name: string; startDate: string; endDate: string; budget: number };

export async function createTrip(profileId: number, input: TripInput): Promise<TripRow> {
  const [row] = await db.insert(financeTrips).values({ profileId, ...input }).returning();
  return row;
}

export async function updateTrip(id: number, input: TripInput) {
  await db.update(financeTrips).set(input).where(eq(financeTrips.id, id));
}

export async function archiveTrip(id: number) {
  await db.update(financeTrips).set({ archivedAt: sql`(current_timestamp)` }).where(eq(financeTrips.id, id));
}

export async function deleteTrip(id: number) {
  // Transactions tagged to this trip keep their trip_id as orphaned once the row is gone; detach first.
  await db.update(financeTransactions).set({ tripId: null }).where(eq(financeTransactions.tripId, id));
  await db.delete(financeTrips).where(eq(financeTrips.id, id));
}

/** Sum of expense transactions tagged to a set of trips. */
export async function getTripSpend(tripIds: number[]): Promise<Map<number, number>> {
  if (tripIds.length === 0) return new Map();
  const rows = await db
    .select({ tripId: financeTransactions.tripId, total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` })
    .from(financeTransactions)
    .where(and(inArray(financeTransactions.tripId, tripIds), eq(financeTransactions.type, "expense")))
    .groupBy(financeTransactions.tripId);
  return new Map(rows.filter((r) => r.tripId !== null).map((r) => [r.tripId as number, r.total]));
}

// --- Money Plan (monthly envelope allocations) -----------------------------------------------

export async function getMoneyPlanAllocations(profileId: number, month: string): Promise<MoneyPlanAllocationRow[]> {
  return db
    .select()
    .from(financeMoneyPlanAllocations)
    .where(and(eq(financeMoneyPlanAllocations.profileId, profileId), eq(financeMoneyPlanAllocations.month, month)));
}

export async function upsertMoneyPlanAllocation(profileId: number, categoryId: number, month: string, plannedAmount: number) {
  await db
    .insert(financeMoneyPlanAllocations)
    .values({ profileId, categoryId, month, plannedAmount })
    .onConflictDoUpdate({
      target: [financeMoneyPlanAllocations.profileId, financeMoneyPlanAllocations.categoryId, financeMoneyPlanAllocations.month],
      set: { plannedAmount },
    });
}

export async function deleteMoneyPlanAllocation(id: number) {
  await db.delete(financeMoneyPlanAllocations).where(eq(financeMoneyPlanAllocations.id, id));
}

export async function getMoneyPlanAllocation(id: number): Promise<MoneyPlanAllocationRow | null> {
  const [row] = await db.select().from(financeMoneyPlanAllocations).where(eq(financeMoneyPlanAllocations.id, id));
  return row ?? null;
}

/** Actual spend per category for a given profile+month, keyed by categoryId. */
export async function getActualSpendByCategory(profileId: number, month: string): Promise<Map<number, number>> {
  const rows = await db
    .select({ categoryId: financeTransactions.categoryId, total: sql<number>`coalesce(sum(${financeTransactions.amount}), 0)` })
    .from(financeTransactions)
    .where(
      and(
        eq(financeTransactions.profileId, profileId),
        eq(financeTransactions.type, "expense"),
        gte(financeTransactions.date, `${month}-01`),
        lte(financeTransactions.date, `${month}-31`)
      )
    )
    .groupBy(financeTransactions.categoryId);
  return new Map(rows.filter((r) => r.categoryId !== null).map((r) => [r.categoryId as number, r.total]));
}

// --- Reminders --------------------------------------------------------------------------------

export async function getRemindersByProfile(profileId: number): Promise<ReminderRow[]> {
  return db.select().from(financeReminders).where(eq(financeReminders.profileId, profileId)).orderBy(asc(financeReminders.dueDate), asc(financeReminders.id));
}

export async function getReminder(id: number): Promise<ReminderRow | null> {
  const [row] = await db.select().from(financeReminders).where(eq(financeReminders.id, id));
  return row ?? null;
}

export type ReminderInput = { title: string; note: string | null; dueDate: string; recurring: boolean };

export async function createReminder(profileId: number, input: ReminderInput): Promise<ReminderRow> {
  const [row] = await db.insert(financeReminders).values({ profileId, ...input }).returning();
  return row;
}

export async function updateReminder(id: number, input: ReminderInput) {
  await db.update(financeReminders).set(input).where(eq(financeReminders.id, id));
}

export async function setReminderDone(id: number, done: boolean) {
  await db
    .update(financeReminders)
    .set({ doneAt: done ? sql`(current_timestamp)` : null })
    .where(eq(financeReminders.id, id));
}

export async function deleteReminder(id: number) {
  await db.delete(financeReminders).where(eq(financeReminders.id, id));
}
