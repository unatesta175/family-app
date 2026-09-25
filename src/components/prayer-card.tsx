"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Undo2, X } from "lucide-react";
import { setPrayerStatus, toggleLogTagAction } from "@/lib/actions";
import { PRAYER_META, STATUS_META, STATUS_ORDER, STATUS_ICON } from "@/lib/prayers";
import type { Prayer, Status } from "@/lib/db/schema";
import type { Tag } from "@/lib/db/repo";
import { cn } from "@/lib/utils";
import { TagSheet } from "@/components/tag-sheet";

const CARD_TONE: Record<"good" | "bad" | "neutral", string> = {
  good: "border-emerald-200 bg-emerald-50/60",
  bad: "border-rose-200 bg-rose-50/60",
  neutral: "border-neutral-200 bg-white",
};

function toneFor(status: Status): "good" | "bad" | "neutral" {
  if (
    status === "on_time_jamaah" ||
    status === "on_time" ||
    status === "jamaah" ||
    status === "late" ||
    status === "qada" ||
    status === "excused"
  )
    return "good";
  if (status === "missed") return "bad";
  return "neutral";
}

function subtitleFor(status: Status): string {
  switch (status) {
    case "on_time_jamaah":
      return "Completed on time, in jamaah";
    case "on_time":
      return "Completed on time";
    case "jamaah":
      return "Completed in jamaah";
    case "late":
      return "Completed, late";
    case "qada":
      return "Made up (qada)";
    case "missed":
      return "Not completed";
    case "excused":
      return "Excused (Hayd)";
    default:
      return "Not marked yet";
  }
}

function reasonLabelFor(status: Status): string {
  switch (status) {
    case "late":
      return "Reason for lateness";
    case "qada":
      return "Reason for qada";
    default:
      return "Reason for missing";
  }
}

const NEEDS_REASON: Status[] = ["missed", "late", "qada"];

export function PrayerCard({
  profileId,
  date,
  prayer,
  status,
  tags,
  allTags,
  readOnly = false,
  haydEnabled = false,
  time,
  isNext = false,
}: {
  profileId: number;
  date: string;
  prayer: Prayer;
  status: Status;
  tags: Tag[];
  allTags: Tag[];
  readOnly?: boolean;
  haydEnabled?: boolean;
  time?: string;
  isNext?: boolean;
}) {
  const meta = PRAYER_META[prayer];
  const Icon = meta.icon;
  const tone = toneFor(status);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const options = haydEnabled ? ([...STATUS_ORDER, "excused"] as const) : STATUS_ORDER;

  const showReasonSection = NEEDS_REASON.includes(status);

  function apply(next: Status) {
    startTransition(() => {
      setPrayerStatus({ profileId, date, prayer, status: next });
    });
  }

  function detachTag(tagId: number) {
    startTransition(() => {
      toggleLogTagAction({ profileId, date, prayer, tagId });
    });
  }

  return (
    <div className={cn("rounded-2xl border p-3.5 transition-colors", CARD_TONE[tone])}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", meta.bg)}>
            <Icon className={cn("h-5 w-5", meta.fg)} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-neutral-900">{meta.label}</p>
              {time && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                    isNext ? "bg-emerald-700 text-white" : "bg-black/5 text-neutral-500"
                  )}
                >
                  {time}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <p
                className={cn(
                  "text-xs font-medium",
                  tone === "good" && "text-emerald-700",
                  tone === "bad" && "text-rose-600",
                  tone === "neutral" && "text-neutral-400"
                )}
              >
                {subtitleFor(status)}
              </p>
              {!expanded &&
                tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium text-neutral-600"
                  >
                    {tag.label}
                  </span>
                ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {status !== "not_yet" && !readOnly && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => apply("not_yet")}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-black/5 disabled:opacity-50"
              aria-label={`Clear ${meta.label} status`}
            >
              <Undo2 className="h-4 w-4" />
            </button>
          )}
          {showReasonSection && (
            <button
              type="button"
              onClick={() => setExpanded((s) => !s)}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-black/5"
              aria-label="Toggle reason"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      <div className={cn("mt-3 grid gap-1 rounded-full bg-black/5 p-1", haydEnabled ? "grid-cols-7" : "grid-cols-6")}>
        {options.map((s) => {
          const active = status === s;
          const StatusIcon = STATUS_ICON[s];
          return (
            <button
              key={s}
              type="button"
              disabled={isPending || readOnly}
              onClick={() => apply(s)}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-1.5 text-[9px] font-semibold transition-colors disabled:opacity-50",
                active
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-white/60"
              )}
            >
              <StatusIcon className="h-3 w-3 shrink-0" strokeWidth={2.5} />
              <span className="truncate">{STATUS_META[s].short}</span>
            </button>
          );
        })}
      </div>

      {showReasonSection && expanded && (
        <div className="mt-3 border-t border-black/5 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            {reasonLabelFor(status)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm"
              >
                {tag.label}
                {!readOnly && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => detachTag(tag.id)}
                    className="rounded-full p-0.5 hover:bg-neutral-100"
                    aria-label={`Remove ${tag.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            {!readOnly && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-200"
              >
                + Add Reason
              </button>
            )}
          </div>
        </div>
      )}

      {sheetOpen && (
        <TagSheet
          profileId={profileId}
          date={date}
          prayer={prayer}
          allTags={allTags}
          selectedTagIds={tags.map((t) => t.id)}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
