"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(app)/logout-action";

export function FinanceSignOutRow() {
  const [pending, startTransition] = useTransition();
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Account</h2>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PAGES" });
            await logoutAction();
          })
        }
        className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3.5 text-left transition-opacity disabled:opacity-60"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-destructive">
          <LogOut className="h-4 w-4" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-bold text-foreground">{pending ? "Signing out…" : "Sign out"}</span>
          <span className="text-xs text-muted-foreground">Log out of your account</span>
        </span>
      </button>
    </section>
  );
}
