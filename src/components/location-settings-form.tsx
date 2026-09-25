"use client";

import { useState, useTransition } from "react";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { updateProfileAction } from "@/lib/actions";
import { CALC_METHOD_META, RECOMMENDED_CALC_METHOD } from "@/lib/prayer-times";
import { CALC_METHODS, MADHABS } from "@/lib/db/schema";
import type { CalcMethod, Madhab } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const MADHAB_LABEL: Record<Madhab, string> = {
  shafi: "Shafi'i, Maliki, Hanbali (Asr shadow ×1)",
  hanafi: "Hanafi (Asr shadow ×2)",
};

export function LocationSettingsForm({
  profile,
  readOnly = false,
}: {
  profile: {
    id: number;
    latitude?: number | null;
    longitude?: number | null;
    locationLabel?: string | null;
    timezone?: string | null;
    calcMethod?: CalcMethod | null;
    madhab?: Madhab | null;
  };
  readOnly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = isPending || readOnly;
  const hasLocation = profile.latitude != null && profile.longitude != null;

  function detectLocation() {
    if (!("geolocation" in navigator)) {
      setError("This browser doesn't support location detection.");
      return;
    }
    setError(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude } = position.coords;
        const label = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        startTransition(() =>
          updateProfileAction({ profileId: profile.id, latitude, longitude, locationLabel: label, timezone })
        );
      },
      (err) => {
        setIsLocating(false);
        setError(err.code === err.PERMISSION_DENIED ? "Location permission denied." : "Couldn't get your location.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Azan times &amp; location</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            Prayer times are calculated from your exact coordinates and recalculated every day.
          </p>
        </div>
        <MapPin className="h-5 w-5 shrink-0 text-emerald-600" />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-neutral-700">
            {hasLocation ? profile.locationLabel ?? "Location set" : "No location set"}
          </p>
          {hasLocation && (
            <p className="text-[11px] text-neutral-400">
              {profile.latitude!.toFixed(4)}, {profile.longitude!.toFixed(4)}
              {profile.timezone ? ` · ${profile.timezone}` : ""}
            </p>
          )}
        </div>
        {!readOnly && (
          <button
            type="button"
            disabled={disabled || isLocating}
            onClick={detectLocation}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            {hasLocation ? "Update" : "Use my location"}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}

      <div className="mt-4">
        <p className="mb-1.5 text-xs font-medium text-neutral-400">Calculation method</p>
        <select
          value={profile.calcMethod ?? ""}
          disabled={disabled}
          onChange={(e) =>
            startTransition(() =>
              updateProfileAction({
                profileId: profile.id,
                calcMethod: (e.target.value || null) as CalcMethod | null,
              })
            )
          }
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 outline-none focus:border-emerald-400"
        >
          <option value="">
            Recommended ({CALC_METHOD_META[RECOMMENDED_CALC_METHOD].label})
          </option>
          {CALC_METHODS.map((m) => (
            <option key={m} value={m}>
              {CALC_METHOD_META[m].label} &mdash; {CALC_METHOD_META[m].region}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium text-neutral-400">Asr calculation (madhab)</p>
        <div className="flex gap-2">
          {MADHABS.map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => startTransition(() => updateProfileAction({ profileId: profile.id, madhab: m }))}
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors",
                (profile.madhab ?? "shafi") === m
                  ? "bg-emerald-700 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {MADHAB_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {!hasLocation && (
        <p className="mt-3 text-[11px] text-neutral-400">
          Set a location to see today&apos;s azan times on the Home tab.
        </p>
      )}
      {hasLocation && !profile.timezone && (
        <p className="mt-3 text-[11px] font-medium text-amber-600">
          Missing timezone from an older location save &mdash; tap &quot;Update&quot; above to fix azan times.
        </p>
      )}
    </div>
  );
}
