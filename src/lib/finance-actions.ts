"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertOwnProfile, getOwnProfileId } from "@/lib/auth";
import { todayIso } from "@/lib/date";
import {
  FINANCE_ACCOUNT_TYPES,
  FINANCE_CARD_THEMES,
  FINANCE_CATEGORY_GROUPS,
  FINANCE_LEND_DIRECTIONS,
  FINANCE_LEND_STATUSES,
  FINANCE_TX_TYPES,
} from "@/lib/db/schema";
import {
  archiveAccount,
  archiveBill,
  createAccount,
  createBill,
  createCategory,
  createLending,
  createTransaction,
  deleteAccount,
  deleteBill,
  deleteCategory,
  deleteLending,
  deleteTransaction,
  getAccount,
  getBill,
  getCategory,
  getLendingEntry,
  getTransaction,
  markBillPaid,
  markBillUnpaid,
  setLendingStatus,
  updateAccount,
  updateBill,
  updateCategory,
  updateLending,
  updateTransaction,
  upsertBudgetSettings,
} from "@/lib/db/repo-finance";

export type FinanceActionResult = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/finance", "layout");
}

function fail(err: unknown): FinanceActionResult {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Invalid input." };
  return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
}

async function requireOwnProfileId(): Promise<number> {
  const id = await getOwnProfileId();
  if (id === null) throw new Error("No profile for this account.");
  return id;
}

const money = z.number().finite().min(-1_000_000_000).max(1_000_000_000);
const positiveMoney = z.number().finite().min(0).max(1_000_000_000);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const name = z.string().trim().min(1, "Give it a name.").max(80);

// --- Accounts --------------------------------------------------------------------------------

const accountSchema = z.object({
  name,
  type: z.enum(FINANCE_ACCOUNT_TYPES),
  icon: z.string().trim().min(1).max(40),
  colorTheme: z.enum(FINANCE_CARD_THEMES),
  balance: money,
  isShared: z.boolean(),
});

export async function saveAccountAction(id: number | null, raw: unknown): Promise<FinanceActionResult> {
  try {
    const input = accountSchema.parse(raw);
    const profileId = await requireOwnProfileId();
    if (id) {
      const account = await getAccount(id);
      if (!account) throw new Error("Account not found.");
      await assertOwnProfile(account.profileId);
      await updateAccount(id, input);
    } else {
      await createAccount(profileId, input);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function archiveAccountAction(id: number): Promise<FinanceActionResult> {
  try {
    const account = await getAccount(id);
    if (!account) throw new Error("Account not found.");
    await assertOwnProfile(account.profileId);
    await archiveAccount(id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteAccountAction(id: number): Promise<FinanceActionResult> {
  try {
    const account = await getAccount(id);
    if (!account) throw new Error("Account not found.");
    await assertOwnProfile(account.profileId);
    await deleteAccount(id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// --- Categories --------------------------------------------------------------------------------

const categorySchema = z.object({
  name,
  icon: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(20),
  group: z.enum(FINANCE_CATEGORY_GROUPS),
});

export async function saveCategoryAction(id: number | null, raw: unknown): Promise<FinanceActionResult> {
  try {
    const input = categorySchema.parse(raw);
    const profileId = await requireOwnProfileId();
    if (id) {
      const cat = await getCategory(id);
      if (!cat) throw new Error("Category not found.");
      await assertOwnProfile(cat.profileId);
      await updateCategory(id, input);
    } else {
      await createCategory(profileId, input);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCategoryAction(id: number): Promise<FinanceActionResult> {
  try {
    const cat = await getCategory(id);
    if (!cat) throw new Error("Category not found.");
    await assertOwnProfile(cat.profileId);
    await deleteCategory(id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// --- Transactions --------------------------------------------------------------------------------

const transactionSchema = z.object({
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable(),
  type: z.enum(FINANCE_TX_TYPES),
  amount: positiveMoney.refine((v) => v > 0, "Enter an amount."),
  note: z.string().trim().max(240).nullable(),
  date: isoDate,
  isShared: z.boolean(),
});

export async function saveTransactionAction(id: number | null, raw: unknown): Promise<FinanceActionResult> {
  try {
    const input = transactionSchema.parse(raw);
    const profileId = await requireOwnProfileId();
    const account = await getAccount(input.accountId);
    if (!account) throw new Error("Account not found.");
    await assertOwnProfile(account.profileId);

    if (id) {
      const tx = await getTransaction(id);
      if (!tx) throw new Error("Transaction not found.");
      await assertOwnProfile(tx.profileId);
      await updateTransaction(id, input);
    } else {
      await createTransaction(profileId, input);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTransactionAction(id: number): Promise<FinanceActionResult> {
  try {
    const tx = await getTransaction(id);
    if (!tx) throw new Error("Transaction not found.");
    await assertOwnProfile(tx.profileId);
    await deleteTransaction(id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Quick-add from the dashboard: today's date, expense type, defaults applied. */
export async function quickAddExpenseAction(raw: { accountId: number; categoryId: number | null; amount: number; note: string | null }): Promise<FinanceActionResult> {
  return saveTransactionAction(null, {
    accountId: raw.accountId,
    categoryId: raw.categoryId,
    type: "expense",
    amount: raw.amount,
    note: raw.note,
    date: todayIso(),
    isShared: true,
  });
}

// --- Bills -----------------------------------------------------------------------------------

const billSchema = z.object({
  name,
  amount: positiveMoney,
  dueDay: z.number().int().min(1).max(31),
  categoryId: z.number().int().positive().nullable(),
  recurring: z.boolean(),
});

export async function saveBillAction(id: number | null, raw: unknown): Promise<FinanceActionResult> {
  try {
    const input = billSchema.parse(raw);
    const profileId = await requireOwnProfileId();
    if (id) {
      const bill = await getBill(id);
      if (!bill) throw new Error("Bill not found.");
      await assertOwnProfile(bill.profileId);
      await updateBill(id, input);
    } else {
      await createBill(profileId, input);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function archiveBillAction(id: number): Promise<FinanceActionResult> {
  try {
    const bill = await getBill(id);
    if (!bill) throw new Error("Bill not found.");
    await assertOwnProfile(bill.profileId);
    await archiveBill(id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteBillAction(id: number): Promise<FinanceActionResult> {
  try {
    const bill = await getBill(id);
    if (!bill) throw new Error("Bill not found.");
    await assertOwnProfile(bill.profileId);
    await deleteBill(id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function markBillPaidAction(billId: number, month: string, amountPaid: number): Promise<FinanceActionResult> {
  try {
    const bill = await getBill(billId);
    if (!bill) throw new Error("Bill not found.");
    await assertOwnProfile(bill.profileId);
    await markBillPaid(billId, month, amountPaid);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function markBillUnpaidAction(billId: number, month: string): Promise<FinanceActionResult> {
  try {
    const bill = await getBill(billId);
    if (!bill) throw new Error("Bill not found.");
    await assertOwnProfile(bill.profileId);
    await markBillUnpaid(billId, month);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// --- Lending -----------------------------------------------------------------------------------

const lendingSchema = z.object({
  counterpartyName: name,
  direction: z.enum(FINANCE_LEND_DIRECTIONS),
  amount: positiveMoney.refine((v) => v > 0, "Enter an amount."),
  note: z.string().trim().max(240).nullable(),
  dueDate: isoDate.nullable(),
});

export async function saveLendingAction(id: number | null, raw: unknown): Promise<FinanceActionResult> {
  try {
    const input = lendingSchema.parse(raw);
    const profileId = await requireOwnProfileId();
    if (id) {
      const entry = await getLendingEntry(id);
      if (!entry) throw new Error("Entry not found.");
      await assertOwnProfile(entry.profileId);
      await updateLending(id, input);
    } else {
      await createLending(profileId, input);
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function setLendingStatusAction(id: number, status: (typeof FINANCE_LEND_STATUSES)[number]): Promise<FinanceActionResult> {
  try {
    const entry = await getLendingEntry(id);
    if (!entry) throw new Error("Entry not found.");
    await assertOwnProfile(entry.profileId);
    await setLendingStatus(id, status);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteLendingAction(id: number): Promise<FinanceActionResult> {
  try {
    const entry = await getLendingEntry(id);
    if (!entry) throw new Error("Entry not found.");
    await assertOwnProfile(entry.profileId);
    await deleteLending(id);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// --- Budget settings -------------------------------------------------------------------------

const budgetSchema = z.object({
  monthlyIncome: positiveMoney,
  paydayDay: z.number().int().min(1).max(31),
  dailyBudgetOverride: positiveMoney.nullable(),
});

export async function saveBudgetSettingsAction(raw: unknown): Promise<FinanceActionResult> {
  try {
    const input = budgetSchema.parse(raw);
    const profileId = await requireOwnProfileId();
    await upsertBudgetSettings(profileId, input);
    refresh();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
