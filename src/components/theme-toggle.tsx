"use client";

import { Sun, Moon } from "lucide-react";
import { useDarkMode } from "@/lib/use-dark-mode";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [dark, setDark] = useDarkMode();

  return (
    <div className="flex rounded-full bg-neutral-100 p-1">
      {(["light", "dark"] as const).map((opt) => {
        const Icon = opt === "light" ? Sun : Moon;
        const active = (opt === "dark") === dark;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => setDark(opt === "dark")}
            aria-pressed={active}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold capitalize transition-colors",
              active ? "bg-emerald-700 text-white" : "text-neutral-500"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt}
          </button>
        );
      })}
    </div>
  );
}
