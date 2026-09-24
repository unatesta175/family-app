"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Tag as TagIcon, X, Plus } from "lucide-react";
import { createAndAttachTagAction, deleteTagAction, toggleLogTagAction } from "@/lib/actions";
import type { Tag } from "@/lib/db/repo";
import type { Prayer } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function TagSheet({
  profileId,
  date,
  prayer,
  allTags,
  selectedTagIds,
  onClose,
}: {
  profileId: number;
  date: string;
  prayer: Prayer;
  allTags: Tag[];
  selectedTagIds: number[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"select" | "create">(allTags.length > 0 ? "select" : "create");
  const [search, setSearch] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredTags = useMemo(
    () => allTags.filter((t) => t.label.toLowerCase().includes(search.trim().toLowerCase())),
    [allTags, search]
  );

  function toggleTag(tagId: number) {
    startTransition(() => {
      toggleLogTagAction({ profileId, date, prayer, tagId });
    });
  }

  function handleDelete(tagId: number) {
    startTransition(() => {
      deleteTagAction(profileId, tagId);
    });
  }

  function handleCreate() {
    if (!newLabel.trim()) return;
    startTransition(async () => {
      await createAndAttachTagAction({ profileId, date, prayer, label: newLabel.trim() });
      setNewLabel("");
      setMode("select");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white px-5 pb-8 pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-neutral-200" />
        <div className="mb-4 flex items-center justify-between">
          <span className="w-8" />
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Manage Tags
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 rounded-full p-1 text-neutral-400 hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex rounded-full bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
              mode === "select" ? "bg-emerald-700 text-white" : "text-neutral-500"
            )}
          >
            Select
          </button>
          <button
            type="button"
            onClick={() => setMode("create")}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
              mode === "create" ? "bg-emerald-700 text-white" : "text-neutral-500"
            )}
          >
            Create New
          </button>
        </div>

        {mode === "select" ? (
          <>
            <div className="mt-4 flex min-h-[3rem] flex-wrap gap-2 overflow-y-auto">
              {filteredTags.length === 0 && (
                <p className="py-2 text-xs text-neutral-400">
                  No tags yet — switch to &ldquo;Create New&rdquo; to add one.
                </p>
              )}
              {filteredTags.map((tag) => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-sm font-medium transition-colors",
                      active ? "bg-emerald-700 text-white" : "bg-neutral-100 text-neutral-700"
                    )}
                  >
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => toggleTag(tag.id)}
                      className="flex items-center gap-1.5"
                    >
                      <TagIcon className={cn("h-3 w-3", active ? "text-emerald-200" : "text-emerald-600")} />
                      {tag.label}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(tag.id)}
                      className={cn(
                        "rounded-full p-1",
                        active ? "hover:bg-white/20" : "hover:bg-neutral-200"
                      )}
                      aria-label={`Delete tag ${tag.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search existing tags..."
                className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-400"
              />
            </div>
          </>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">What is the reason?</p>
              <p className="text-xs text-neutral-400">Create a tag to identify patterns over time.</p>
            </div>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g., Procrastination, Busy..."
              className="w-full rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              disabled={isPending || !newLabel.trim()}
              onClick={handleCreate}
              className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Create and Select Tag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
