"use client";

import { useState, useTransition } from "react";
import { createCategoryAction, updateCategoryAction } from "@/lib/habit-actions";
import { colorHex } from "@/lib/habits";
import { Sheet } from "@/components/habits/sheet";
import { ColorPicker, Field, IconPicker, inputClass, type CategoryOption } from "@/components/habits/form-bits";

export function CategorySheet({
  onClose,
  initial,
}: {
  onClose: () => void;
  initial: CategoryOption | null;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "indigo");
  const [icon, setIcon] = useState(initial?.icon ?? "layers");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = initial
        ? await updateCategoryAction(initial.id, { name, color, icon })
        : await createCategoryAction({ name, color, icon });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={initial ? "Edit category" : "New category"}
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            style={{ background: colorHex(color) }}
            className="w-full rounded-xl py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pt-1">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Health & Fitness"
            className={inputClass}
            autoFocus
          />
        </Field>
        <Field label="Colour">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
        <Field label="Icon">
          <IconPicker value={icon} onChange={setIcon} color={colorHex(color)} />
        </Field>
      </div>
    </Sheet>
  );
}
