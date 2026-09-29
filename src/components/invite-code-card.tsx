"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function InviteCodeCard({ inviteCode, householdName }: { inviteCode: string; householdName: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the code is still visible to copy manually
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-1 text-sm font-semibold text-neutral-900">Invite family</p>
      <p className="mb-3 text-xs text-neutral-400">
        Share this code so others can join {householdName} and see each other&apos;s prayer progress.
      </p>
      <button
        onClick={copy}
        className="flex w-full items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-left transition-colors hover:bg-neutral-100"
      >
        <span className="font-mono text-sm font-semibold tracking-widest text-neutral-900">{inviteCode}</span>
        {copied ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <Copy className="h-4 w-4 shrink-0 text-neutral-400" />
        )}
      </button>
    </div>
  );
}
