"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { AccountFormModal } from "@/components/finance/account-form";
import { AccountIcon, ACCOUNT_TYPE_LABEL } from "@/components/finance/finance-icons";
import { archiveAccountAction, deleteAccountAction } from "@/lib/finance-actions";
import type { AccountRow } from "@/lib/db/repo-finance";

const money = (n: number) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AccountRowList({ accounts, readOnly }: { accounts: AccountRow[]; readOnly: boolean }) {
  const [editing, setEditing] = useState<AccountRow | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  return (
    <>
      <ul className="flex flex-col divide-y divide-border">
        {accounts.map((a, i) => (
          <li key={a.id} className="relative flex items-center gap-3 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
              <AccountIcon icon={a.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold">{a.name}</span>
                <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {i === 0 ? "Default" : ACCOUNT_TYPE_LABEL[a.type]}
                </span>
              </span>
              <span className="block text-[11px] font-semibold text-muted-foreground">{a.isShared ? "Shared" : "Private"}</span>
            </span>
            <span className="shrink-0 text-sm font-extrabold tabular-nums">{money(a.balance)}</span>
            {!readOnly && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuFor(menuFor === a.id ? null : a.id)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Account actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuFor === a.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                    <div className="absolute right-0 top-full z-20 mt-1 flex w-36 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md">
                      <button
                        type="button"
                        className="px-3 py-2 text-left text-xs font-bold hover:bg-muted"
                        onClick={() => {
                          setMenuFor(null);
                          setEditing(a);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 text-left text-xs font-bold hover:bg-muted"
                        onClick={() => {
                          setMenuFor(null);
                          archiveAccountAction(a.id);
                        }}
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        className="px-3 py-2 text-left text-xs font-bold text-destructive hover:bg-muted"
                        onClick={() => {
                          setMenuFor(null);
                          if (confirm(`Delete "${a.name}"? This removes its transaction history too.`)) deleteAccountAction(a.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      {editing && <AccountFormModal account={editing} open onClose={() => setEditing(null)} />}
    </>
  );
}
