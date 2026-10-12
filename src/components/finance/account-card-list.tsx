"use client";

import { useState } from "react";
import { AccountCard } from "@/components/finance/account-card";
import { AccountFormModal } from "@/components/finance/account-form";
import type { AccountRow } from "@/lib/db/repo-finance";

export function AccountCardClientList({ accounts, readOnly }: { accounts: AccountRow[]; readOnly: boolean }) {
  const [editing, setEditing] = useState<AccountRow | null>(null);
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} readOnly={readOnly} onEdit={() => setEditing(a)} />
        ))}
      </div>
      {editing && <AccountFormModal account={editing} open onClose={() => setEditing(null)} />}
    </>
  );
}
