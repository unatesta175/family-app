"use client";

import { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
      ? "dark"
      : "light"
  );

  function apply(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {}
  }

  return (
    <div className="flex rounded-full bg-neutral-100 p-1">
      {(["light", "dark"] as const).map((opt) => {
        const Icon = opt === "light" ? Sun : Moon;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => apply(opt)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold capitalize transition-colors",
              theme === opt ? "bg-emerald-700 text-white" : "text-neutral-500"
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
