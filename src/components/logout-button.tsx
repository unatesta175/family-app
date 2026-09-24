"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/(app)/logout-action";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm transition-colors hover:text-rose-600 disabled:opacity-60"
      aria-label="Log out"
      title="Log out"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
