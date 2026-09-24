import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveProfileId } from "@/lib/session";
import { NewChallengeForm } from "@/components/new-challenge-form";

export default async function NewChallengePage() {
  const profileId = await getActiveProfileId();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-50"
          aria-label="Back to Home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xs font-bold uppercase tracking-widest text-neutral-400">New Challenge</h1>
      </div>

      <NewChallengeForm profileId={profileId} />
    </div>
  );
}
