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
  financeTransactions,
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

export type BudgetSettingsInput = { monthlyIncome: number; paydayDay: number; dailyBudgetOverride: number | null };

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
