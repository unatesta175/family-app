import { colorHex, tint } from "@/lib/habits";
import type { HeatCell } from "@/lib/habit-stats";
import { cn } from "@/lib/utils";

/**
 * GitHub/HabitKit-style contribution grid: one column per week, one square per day, filled with
 * the habit's own colour when done. Pure markup, so it renders on the server with no JS.
 */
export function Heatmap({
  weeks,
  color,
  cell = 12,
  className,
}: {
  weeks: HeatCell[][];
  color: string;
  cell?: number;
  className?: string;
}) {
  const hex = colorHex(color);
  return (
    <div className={cn("flex gap-[3px]", className)}>
      {weeks.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((c) => {
            let bg = "var(--h-surface-2)";
            let border = "transparent";
            switch (c.state) {
              case "done":
                bg = hex;
                break;
              case "partial":
                bg = tint(hex, 0.45);
                break;
              case "slipped":
                bg = "var(--h-bad)";
                break;
              case "missed":
                bg = "color-mix(in srgb, var(--h-bad) 14%, var(--h-surface-2))";
                break;
              case "skipped":
                bg = "var(--h-surface-2)";
                border = "var(--h-border)";
                break;
              case "upcoming":
                bg = "transparent";
                border = "var(--h-border)";
                break;
              case "prestart":
              case "off":
                bg = "color-mix(in srgb, var(--h-surface-2) 50%, transparent)";
                break;
            }
            return (
              <span
                key={c.date}
                title={`${c.date} · ${c.state}`}
                style={{ width: cell, height: cell, background: bg, borderColor: border }}
                className="rounded-[3px] border"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
