"use client";

import { useState, useTransition } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { switchActiveProfile } from "@/lib/actions";
import { logoutAction } from "@/app/(app)/logout-action";
import { cn } from "@/lib/utils";

type Profile = { id: number; name: string };

export function HabitProfileSwitcher({
  profiles,
  activeProfileId,
}: {
  profiles: Profile[];
  activeProfileId: number;
}) {
  const [pending, startTransition] = useTransition();
  if (profiles.length < 2) return null;
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-h-border bg-h-surface p-0.5 shadow-sm">
      {profiles.map((p) => {
        const active = p.id === activeProfileId;
        return (
          <button
            key={p.id}
            disabled={pending}
            onClick={() => startTransition(() => switchActiveProfile(p.id))}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60",
              active ? "bg-h-brand text-h-brand-fg" : "text-h-muted hover:text-h-fg"
            )}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );
}

export function HabitThemeToggle() {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-h-border bg-h-surface text-h-muted shadow-sm transition-colors hover:text-h-fg"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function HabitLogout() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PAGES" });
          await logoutAction();
        })
      }
      aria-label="Log out"
      title="Log out"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-h-border bg-h-surface text-h-muted shadow-sm transition-colors hover:text-h-bad disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
