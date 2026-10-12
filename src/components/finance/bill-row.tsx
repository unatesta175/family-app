"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { markBillPaidAction, markBillUnpaidAction } from "@/lib/finance-actions";
import { BillFormModal } from "@/components/finance/bill-form";
import type { BillRow, BillPaymentRow, CategoryRow } from "@/lib/db/repo-finance";
import { cn } from "@/lib/utils";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const currentDay = Number(today.slice(8, 10));
  const overdue = !paid && bill.dueDay < currentDay && today.slice(0, 7) === month;

  function toggle() {
    startTransition(async () => {
      if (paid) await markBillUnpaidAction(bill.id, month);
      else await markBillPaidAction(bill.id, month, payment?.amountPaid ?? bill.amount);
    });
  }

  return (
    <li className={cn("flex items-center gap-3 py-3", overdue && "rounded-xl bg-h-break-soft px-2")}>
      <button
        type="button"
        disabled={readOnly || pending}
        onClick={toggle}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          paid ? "border-h-good bg-h-good text-white" : "border-h-border text-transparent hover:border-h-brand"
        )}
        aria-label={paid ? "Mark unpaid" : "Mark paid"}
      >
        <Check className="h-4 w-4" />
      </button>
      <button type="button" disabled={readOnly} onClick={() => setEditing(true)} className="min-w-0 flex-1 text-left disabled:cursor-default">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{bill.name}</span>
          {overdue && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-h-bad" />}
        </span>
        <span className="block text-[11px] font-semibold text-h-muted">Due day {bill.dueDay}{overdue && " · overdue"}</span>
      </button>
      <span className="shrink-0 text-sm font-extrabold tabular-nums">{money(payment?.amountPaid ?? bill.amount)}</span>
      {editing && <BillFormModal bill={bill} categories={categories} open onClose={() => setEditing(false)} />}
    </li>
  );
}
