"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { updateProfileAction } from "@/lib/actions";
import { cn } from "@/lib/utils";

const THEMES = [
  { id: "green", swatch: "bg-emerald-600" },
  { id: "rose", swatch: "bg-rose-500" },
  { id: "sky", swatch: "bg-sky-500" },
  { id: "amber", swatch: "bg-amber-500" },
];

const GENDERS = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
] as const;

type Profile = {
  id: number;
  name: string;
  colorTheme: string;
  age?: number | null;
  gender?: "male" | "female" | null;
  dateOfBirth?: string | null;
  haydMode?: boolean;
};

export function ProfileSettingsForm({
  profile,
  isActive,
  readOnly = false,
}: {
  profile: Profile;
  isActive: boolean;
  readOnly?: boolean;
}) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age != null ? String(profile.age) : "");
  const [dob, setDob] = useState(profile.dateOfBirth ?? "");
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || readOnly;

  function commitAge() {
    const trimmed = age.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (!Number.isInteger(parsed) || parsed < 1 || parsed > 120)) return;
    if (parsed !== (profile.age ?? null)) {
      startTransition(() => updateProfileAction({ profileId: profile.id, age: parsed }));
    }
  }

  function commitDob() {
    const value = dob.trim();
    const next = value === "" ? null : value;
    if (next !== (profile.dateOfBirth ?? null)) {
      startTransition(() => updateProfileAction({ profileId: profile.id, dateOfBirth: next }));
    }
  }

  return (
    <div className={cn("rounded-2xl bg-white p-4 shadow-sm", isActive && "ring-2 ring-emerald-200")}>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() && name !== profile.name) {
              startTransition(() => updateProfileAction({ profileId: profile.id, name: name.trim() }));
            }
          }}
          disabled={disabled}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-900 outline-none focus:border-emerald-400"
        />
        {isActive && (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
            Active
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-neutral-400" htmlFor={`age-${profile.id}`}>
            Age
          </label>
          <input
            id={`age-${profile.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            onBlur={commitAge}
            disabled={disabled}
            placeholder="—"
            className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm font-semibold text-neutral-900 outline-none focus:border-emerald-400"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-neutral-400" htmlFor={`dob-${profile.id}`}>
            Date of birth
          </label>
          <input
            id={`dob-${profile.id}`}
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            onBlur={commitDob}
            disabled={disabled}
            max={new Date().toISOString().slice(0, 10)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm font-semibold text-neutral-900 outline-none focus:border-emerald-400"
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-neutral-400">Used to estimate lifetime prayers</p>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-neutral-400">Gender</p>
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                startTransition(() =>
                  updateProfileAction({
                    profileId: profile.id,
                    gender: profile.gender === g.id ? null : g.id,
                  })
                )
              }
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                profile.gender === g.id
                  ? "bg-emerald-700 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {profile.gender === "female" && (
        <div className="mt-3">
          <div className="flex items-center gap-3 rounded-xl bg-pink-50 px-3 py-2.5">
            <Heart className="h-4 w-4 shrink-0 text-pink-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-pink-800">Hayd mode</p>
              <p className="text-[11px] text-pink-600/80">
                Shows an &quot;Excused&quot; option so prayers don&apos;t break your streak
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                startTransition(() => updateProfileAction({ profileId: profile.id, haydMode: !profile.haydMode }))
              }
              aria-pressed={!!profile.haydMode}
              aria-label="Toggle Hayd mode"
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
                profile.haydMode ? "bg-pink-600" : "bg-neutral-300"
              )}
            >
              <span
                className={cn(
                  "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  profile.haydMode ? "translate-x-[20px]" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-neutral-400">Accent color</p>
        <div className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={disabled}
              onClick={() => startTransition(() => updateProfileAction({ profileId: profile.id, colorTheme: t.id }))}
              className={cn(
                "h-6 w-6 rounded-full",
                t.swatch,
                profile.colorTheme === t.id && "ring-2 ring-offset-2 ring-neutral-400"
              )}
              aria-label={`Set theme ${t.id}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
