import { SLOTS_PER_FLOOR, SLOT_LABEL, slotDateLabel, type SlotKind, type TowerData } from "@/lib/habit-tower";
import { colorHex, tint } from "@/lib/habits";

function cellStyle(kind: SlotKind, hex: string, streak: boolean): React.CSSProperties {
  switch (kind) {
    case "done":
      return streak ? { background: "#ffb020", boxShadow: "0 0 6px #ffb020" } : { background: hex };
    case "partial":
      return { background: tint(hex, 0.45) };
    case "missed":
      return { background: "#ef4444" };
    case "skipped":
      return { background: "#7dd3fc99", border: "1px solid #7dd3fc" };
    case "pending":
      return { border: `2px solid ${hex}`, background: tint(hex, 0.1) };
    case "future":
      return { border: "1px dashed var(--h-border)" };
    default:
      return { background: "color-mix(in srgb, var(--h-surface-2) 55%, transparent)" };
  }
}

/**
 * The tower as a flat stack of month floors (newest on top), one square per date. It's the fallback
 * for devices without WebGL, and it reads the same history as the 3D tower. Pure markup.
 */
export function TowerFlat({ data, color }: { data: TowerData; color: string }) {
  const hex = colorHex(color);
  const floors = [...data.floors].reverse();
  return (
    <div className="flex flex-col gap-1.5" role="img" aria-label={`Habit tower: ${data.totalDone} completed days over ${data.floors.length} months`}>
      {floors.map((f) => (
        <div key={f.month} className="flex items-center gap-2">
          <span className="w-12 shrink-0 text-right text-[10px] font-bold tabular-nums text-h-muted">{f.shortLabel}</span>
          <div className="grid min-w-0 flex-1 gap-[2px]" style={{ gridTemplateColumns: `repeat(${SLOTS_PER_FLOOR}, minmax(0, 1fr))` }}>
            {Array.from({ length: SLOTS_PER_FLOOR }, (_, i) => {
              const slot = f.slots[i];
              if (!slot) return <span key={i} />;
              return <span key={i} title={`${slotDateLabel(slot.date)} · ${SLOT_LABEL[slot.kind]}`} style={cellStyle(slot.kind, hex, slot.streak)} className="aspect-square rounded-[3px]" />;
            })}
          </div>
          <span className="w-9 shrink-0 text-[10px] font-extrabold tabular-nums text-h-muted">
            {f.done}/{f.due}
          </span>
        </div>
      ))}
    </div>
  );
}
