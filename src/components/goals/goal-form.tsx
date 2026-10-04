"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Lock, Users, X } from "lucide-react";
import { createGoalAction, updateGoalAction, type GoalFormInput } from "@/lib/goal-actions";
import { colorHex } from "@/lib/habits";
import { todayIso } from "@/lib/date";
import { GOAL_AREAS, TRACKING_META } from "@/lib/goals";
import { fileToDataUrl } from "@/lib/resize-image";
import type { GoalHabitKind, GoalTracking, GoalVisibility } from "@/lib/db/schema";
import { Sheet } from "@/components/habits/sheet";
import { ColorPicker, Field, IconPicker, Segmented, inputClass } from "@/components/habits/form-bits";
import { Caption, FormSection, NumberInput, OptionCard, ToggleRow } from "@/components/habits/form-fields";
import { Switch } from "@/components/habits/ui/switch";
import { cn } from "@/lib/utils";
import { CheckCircle2, Hash, ListChecks } from "lucide-react";

export type GoalFormValues = {
  id?: number;
  title: string;
  why: string;
  area: string;
  icon: string;
  color: string;
  priority: number; // 0 = none
  startDate: string;
  targetDate: string | null;
  visibility: GoalVisibility;
  tracking: GoalTracking;
  targetValue: number;
  targetUnit: string;
  startValue: number;
  habitKind: GoalHabitKind;
  habitTarget: number;
  quote: string;
  imageData: string | null;
};

export function emptyGoal(): GoalFormValues {
  return {
    title: "",
    why: "",
    area: "Personal",
    icon: "target",
    color: "amber",
    priority: 0,
    startDate: todayIso(),
    targetDate: null,
    visibility: "private", // goals are private until you share them
    tracking: "milestones",
    targetValue: 100,
    targetUnit: "",
    startValue: 0,
    habitKind: "checkins",
    habitTarget: 30,
    quote: "",
    imageData: null,
  };
}

const TRACKING_ICONS = { milestones: ListChecks, measure: Hash, habits: CheckCircle2 } as const;

export function GoalFormSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: GoalFormValues;
}) {
  const router = useRouter();
  const editing = initial.id !== undefined;
  const [v, setV] = useState<GoalFormValues>(initial);
  const [steps, setSteps] = useState(""); // first milestones, one per line (new goals only)
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const hex = colorHex(v.color);

  function set<K extends keyof GoalFormValues>(key: K, value: GoalFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function pickArea(name: string) {
    const area = GOAL_AREAS.find((a) => a.name === name);
    setV((prev) => ({
      ...prev,
      area: name,
      // Nudge the colour/icon to the area while they're still the untouched defaults.
      color: area && prev.color === "amber" && prev.icon === "target" ? area.color : prev.color,
      icon: area && prev.icon === "target" && prev.color === "amber" ? area.icon : prev.icon,
    }));
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    try {
      set("imageData", await fileToDataUrl(file));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't use that image.");
    }
  }

  function submit() {
    setError(null);
    const payload: GoalFormInput = {
      title: v.title,
      why: v.why,
      area: v.area,
      icon: v.icon,
      color: v.color,
      priority: v.priority,
      startDate: v.startDate,
      targetDate: v.targetDate,
      visibility: v.visibility,
      tracking: v.tracking,
      targetValue: v.targetValue,
      targetUnit: v.targetUnit,
      startValue: v.startValue,
      habitKind: v.habitKind,
      habitTarget: v.habitTarget,
      quote: v.quote,
      imageData: v.imageData,
      milestones: !editing && v.tracking === "milestones" ? steps.split("\n").map((s) => s.trim()).filter(Boolean) : undefined,
    };
    startTransition(async () => {
      if (editing) {
        const res = await updateGoalAction(initial.id!, payload);
        if (!res.ok) return setError(res.error);
        onClose();
        return;
      }
      const res = await createGoalAction(payload);
      if (!res.ok) return setError(res.error);
      onClose();
      router.push(`/goals/${res.data.id}`);
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit goal" : "New goal"}
      className="sm:max-w-xl"
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-xs font-semibold text-h-bad">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            style={{ background: hex }}
            className="w-full rounded-xl py-3 text-sm font-extrabold text-white shadow-sm transition-opacity disabled:opacity-60"
          >
            {pending ? "Saving…" : editing ? "Save changes" : "Create goal"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <FormSection title="The goal">
          <Field label="Title">
            <input
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Memorise Juz' Amma, Save for Hajj, Run a half marathon"
              maxLength={120}
              className={inputClass}
              autoFocus={!editing}
            />
          </Field>
          <Field label="Why does it matter? (optional)">
            <textarea
              value={v.why}
              onChange={(e) => set("why", e.target.value)}
              placeholder="Your reason, in your own words. It helps on the hard days."
              maxLength={2000}
              rows={4}
              className={cn(inputClass, "resize-none")}
            />
          </Field>
          <Field label="Life area">
            <div className="flex flex-wrap gap-1.5">
              {GOAL_AREAS.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => pickArea(a.name)}
                  aria-pressed={v.area === a.name}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                    v.area === a.name ? "border-h-fg bg-h-fg text-h-bg" : "border-h-border bg-h-surface text-h-muted hover:text-h-fg"
                  )}
                >
                  {a.name}
                </button>
              ))}
            </div>
            <input
              value={GOAL_AREAS.some((a) => a.name === v.area) ? "" : v.area}
              onChange={(e) => set("area", e.target.value || "Personal")}
              placeholder="…or type your own area"
              maxLength={30}
              className={cn(inputClass, "mt-1")}
            />
          </Field>
          <Field label="Colour">
            <ColorPicker value={v.color} onChange={(c) => set("color", c)} />
          </Field>
          <Field label="Icon">
            <IconPicker value={v.icon} onChange={(i) => set("icon", i)} color={hex} />
          </Field>
        </FormSection>

        <FormSection title="How do you track progress?" description="Pick the one that fits. You can change it later.">
          <div role="radiogroup" aria-label="Progress tracking" className="grid grid-cols-3 gap-2">
            {(Object.keys(TRACKING_META) as GoalTracking[]).map((k) => (
              <OptionCard
                key={k}
                active={v.tracking === k}
                onClick={() => set("tracking", k)}
                icon={TRACKING_ICONS[k]}
                title={TRACKING_META[k].label}
                description={TRACKING_META[k].hint}
                accent={hex}
              />
            ))}
          </div>

          {v.tracking === "measure" && (
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-h-surface2 p-3">
              <label className="flex flex-col gap-1">
                <Caption>Target</Caption>
                <NumberInput value={v.targetValue} min={0} onChange={(n) => set("targetValue", n ?? 0)} />
              </label>
              <label className="flex flex-col gap-1">
                <Caption>Unit</Caption>
                <input value={v.targetUnit} onChange={(e) => set("targetUnit", e.target.value)} placeholder="km, books…" maxLength={20} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1">
                <Caption>Starting at</Caption>
                <NumberInput value={v.startValue} min={0} onChange={(n) => set("startValue", n ?? 0)} />
              </label>
            </div>
          )}

          {v.tracking === "habits" && (
            <div className="flex flex-col gap-2 rounded-xl bg-h-surface2 p-3">
              <Segmented<GoalHabitKind>
                value={v.habitKind}
                onChange={(k) => set("habitKind", k)}
                options={[
                  { value: "checkins", label: "Count check-ins" },
                  { value: "streak", label: "Reach a streak" },
                ]}
              />
              <label className="flex flex-col gap-1">
                <Caption>{v.habitKind === "streak" ? "Streak to reach (days)" : "Check-ins to reach"}</Caption>
                <NumberInput integer value={v.habitTarget} min={1} onChange={(n) => set("habitTarget", n ?? 1)} className="max-w-32" />
              </label>
              <p className="text-[11px] leading-snug text-h-muted">Link habits to the goal on its page once you&apos;ve created it.</p>
            </div>
          )}

          {!editing && v.tracking === "milestones" && (
            <Field label="First milestones (optional)" hint="One per line. You can add dates and more later.">
              <textarea
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder={"Find a teacher\nFinish the first chapter"}
                rows={4}
                className={cn(inputClass, "resize-none")}
              />
            </Field>
          )}
        </FormSection>

        <FormSection title="Timing & priority">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <Caption>Start date</Caption>
              <input type="date" value={v.startDate} onChange={(e) => e.target.value && set("startDate", e.target.value)} className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <Caption>Target date (optional)</Caption>
              <div className="relative">
                <input
                  type="date"
                  value={v.targetDate ?? ""}
                  min={v.startDate}
                  onChange={(e) => set("targetDate", e.target.value || null)}
                  className={cn(inputClass, v.targetDate && "pr-9")}
                />
                {v.targetDate && (
                  <button
                    type="button"
                    aria-label="Clear target date"
                    onClick={() => set("targetDate", null)}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-h-muted hover:bg-h-border"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <Caption>Priority (optional)</Caption>
            <NumberInput integer min={1} max={99} value={v.priority > 0 ? v.priority : null} placeholder="None" onChange={(n) => set("priority", n ?? 0)} className="max-w-28" />
            <span className="text-[11px] text-h-muted">1 is the highest and sorts to the top.</span>
          </label>
        </FormSection>

        <FormSection title="Vision" description="Optional. A picture and a line that make the goal feel real.">
          {v.imageData ? (
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.imageData} alt="Vision" className="h-40 w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => set("imageData", null)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-h-border py-6 text-sm font-bold text-h-brand hover:bg-h-brand-soft"
            >
              <ImagePlus className="h-4 w-4" />
              Add a picture
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
          <input value={v.quote} onChange={(e) => set("quote", e.target.value)} placeholder="A quote or a one-line reminder" maxLength={240} className={inputClass} />
        </FormSection>

        <FormSection title="Who can see it?">
          <ToggleRow
            title="Share with my family circle"
            description={
              v.visibility === "shared"
                ? "Everyone in your household can see this goal, log progress and link their own habits to it."
                : "Private. Only you can see this goal. Turn this on to share it."
            }
          >
            <Switch
              checked={v.visibility === "shared"}
              onCheckedChange={(c) => set("visibility", c ? "shared" : "private")}
              aria-label="Share with my family circle"
            />
          </ToggleRow>
          <p className="-mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-h-muted">
            {v.visibility === "shared" ? <Users className="h-3.5 w-3.5 text-h-brand" /> : <Lock className="h-3.5 w-3.5" />}
            {v.visibility === "shared" ? "Shared" : "Private"}
          </p>
        </FormSection>
      </div>
    </Sheet>
  );
}
