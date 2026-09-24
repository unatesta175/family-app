import { redirect } from "next/navigation";
import { getActiveProfileId } from "@/lib/session";
import { getOwnProfileId } from "@/lib/auth";
import { getProfile } from "@/lib/db/repo";
import { todayIso } from "@/lib/date";
import { SelectDaysPage } from "@/components/select-days-page";

export default async function BulkLogPage() {
  const profileId = await getActiveProfileId();
  const ownProfileId = await getOwnProfileId();
  if (ownProfileId !== null && profileId !== ownProfileId) {
    redirect("/history");
  }
  const today = todayIso();
  const profile = await getProfile(profileId);

  const haydEnabled = profile?.gender === "female" && !!profile.haydMode;

  return <SelectDaysPage profileId={profileId} today={today} haydEnabled={haydEnabled} />;
}
