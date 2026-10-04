"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createCategoryAction } from "@/lib/habit-actions";
import { colorHex, tint } from "@/lib/habits";
import { habitIcon } from "@/lib/habit-icons";
import { cn } from "@/lib/utils";
import { ColorPicker, IconPicker, inputClass, type CategoryOption } from "@/components/habits/form-bits";

/** Category chips with inline "New" creation — categories are user data, not a fixed list. */
export function CategorySelect({
  categories,
  value,
  onChange,
  onCreated,
  fallbackColor,
}: {
  categories: CategoryOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  onCreated: (cat: CategoryOption) => void;
  fallbackColor: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("layers");
  const [color, setColor] = useState<string | null>(null); // null = follow the form's colour
  const chosenColor = color ?? fallbackColor;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createCategoryAction({ name, color: chosenColor, icon });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onCreated(res.data);
      onChange(res.data.id);
      setName("");
      setIcon("layers");
      setColor(null);
      setAdding(false);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
            value === null
              ? "border-h-fg bg-h-fg text-h-bg"
              : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
          )}
        >
          None
        </button>
        {categories.map((c) => {
          const Icon = habitIcon(c.icon);
          const active = value === c.id;
          const hex = colorHex(c.color);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              style={active ? { background: tint(hex, 0.16), borderColor: hex, color: hex } : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                active ? "" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {c.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-1 rounded-full border border-dashed border-h-border px-3 py-1.5 text-xs font-bold text-h-brand hover:bg-h-brand-soft"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>
      {adding && (
        <div className="flex flex-col gap-3 rounded-xl border border-h-border bg-h-surface2 p-3">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name"
              maxLength={40}
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
            />
            <button
              type="button"
              disabled={pending || !name.trim()}
              onClick={create}
              className="rounded-xl bg-h-brand px-4 text-sm font-bold text-h-brand-fg disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-h-muted">Icon</span>
            <IconPicker value={icon} onChange={setIcon} color={colorHex(chosenColor)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-h-muted">Colour</span>
            <ColorPicker value={chosenColor} onChange={setColor} />
          </div>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
    </div>
  );
}
