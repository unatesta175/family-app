"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check, Repeat, CalendarClock } from "lucide-react";
import { markBillPaidAction, markBillUnpaidAction } from "@/lib/finance-actions";
import { BillFormModal } from "@/components/finance/bill-form";
import { FinanceCategoryIcon } from "@/components/finance/finance-icons";
import { billDueDateInMonth, billNextOccurrence } from "@/lib/finance-bills";
import type { BillRow, BillPaymentRow, CategoryRow } from "@/lib/db/repo-finance";
import { colorHex } from "@/lib/habits";
import { cn } from "@/lib/utils";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DAY_MONTH = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-MY", { day: "numeric", month: "short" });

export function BillRowItem({
  bill,
  payment,
  month,
  today,
  categories,
  readOnly,
}: {
  bill: BillRow;
  payment: BillPaymentRow | null;
  month: string;
  today: string;
  categories: CategoryRow[];
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const paid = !!payment?.paidAt;
  const dueDate = billDueDateInMonth(bill, month) ?? `${month}-01`;
  const overdue = !paid && dueDate < today;
  const cat = bill.categoryId ? categories.find((c) => c.id === bill.categoryId) : null;

  function toggle() {
    startTransition(async () => {
      if (paid) await markBillUnpaidAction(bill.id, month);
      else await markBillPaidAction(bill.id, month, payment?.amountPaid ?? bill.amount);
    });
  }

  return (
    <li
      className={cn(
        "flex items-center gap-3 py-3",
        overdue && "!border-t-0 my-1 rounded-xl bg-destructive/10 px-2 first:mt-0 last:mb-0"
      )}
    >
      <button
        type="button"
        disabled={readOnly || pending}
        onClick={toggle}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          paid ? "border-success bg-success text-white" : "border-border text-transparent hover:border-primary"
        )}
        aria-label={paid ? "Mark unpaid" : "Mark paid"}
      >
        <Check className="h-4 w-4" />
      </button>
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${colorHex(cat?.color ?? "steel")}1f`, color: colorHex(cat?.color ?? "steel") }}
      >
        <FinanceCategoryIcon icon={cat?.icon} className="h-4 w-4" />
      </span>
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-bold">{bill.name}</span>
          {bill.frequency !== "monthly" && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
              {bill.frequency === "yearly" ? "Yearly" : "One-time"}
            </span>
          )}
          {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
        </span>
        <span className="block text-[11px] font-semibold text-muted-foreground">
          Due {DAY_MONTH(dueDate)}
          {overdue && " · overdue"}
        </span>
      </button>
      <span className="shrink-0 text-sm font-extrabold tabular-nums">{money(payment?.amountPaid ?? bill.amount)}</span>
      {editing && <BillFormModal bill={bill} categories={categories} open onClose={() => setEditing(false)} />}
    </li>
  );
}

/** A yearly/one-time bill that isn't due this month — shown in the "Upcoming" section so it's never forgotten. */
export function BillUpcomingItem({
  bill,
  today,
  categories,
  readOnly,
}: {
  bill: BillRow;
  today: string;
  categories: CategoryRow[];
  readOnly: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const next = billNextOccurrence(bill, today);
  const overdue = bill.frequency === "once" && next < today;
  const cat = bill.categoryId ? categories.find((c) => c.id === bill.categoryId) : null;

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `${colorHex(cat?.color ?? "steel")}1f`, color: colorHex(cat?.color ?? "steel") }}
      >
        <FinanceCategoryIcon icon={cat?.icon} className="h-4 w-4" />
      </span>
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-sm font-bold">{bill.name}</span>
          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            {bill.frequency === "yearly" ? <Repeat className="h-2.5 w-2.5" /> : <CalendarClock className="h-2.5 w-2.5" />}
            {bill.frequency === "yearly" ? "Yearly" : "One-time"}
          </span>
        </span>
        <span className={cn("block text-[11px] font-semibold text-muted-foreground", overdue && "text-destructive")}>
          {overdue ? "Overdue since " : "Due "}
          {DAY_MONTH(next)}
        </span>
      </button>
      <span className="shrink-0 text-sm font-extrabold tabular-nums text-muted-foreground">{money(bill.amount)}</span>
      {editing && <BillFormModal bill={bill} categories={categories} open onClose={() => setEditing(false)} />}
    </li>
  );
}
