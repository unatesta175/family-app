"use client";

import { Moon, Sun } from "lucide-react";
import { useDarkMode } from "@/lib/use-dark-mode";

/** Compact light/dark switch for the prayer header. */
export function ThemeToggleIcon() {
  const [dark, setDark] = useDarkMode();
  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm transition-colors hover:text-emerald-700"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
