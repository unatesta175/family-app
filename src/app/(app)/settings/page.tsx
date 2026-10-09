import { getProfile, getHousehold } from "@/lib/db/repo";
import { getOwnProfileId, requireAuth } from "@/lib/auth";
import { countSubscriptionsForProfile, getPrefs, prefsPrayers } from "@/lib/db/repo-notifications";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { LocationSettingsForm } from "@/components/location-settings-form";
import { PrayerRemindersForm } from "@/components/prayer-reminders-form";
import { ExportDataButton } from "@/components/export-data-button";
import { ThemeToggle } from "@/components/theme-toggle-loader";
import { InviteCodeCard } from "@/components/invite-code-card";

export default async function SettingsPage() {
  const session = await requireAuth();
  const [ownProfileId, household] = await Promise.all([getOwnProfileId(), getHousehold(session.householdId)]);
  const ownProfile = ownProfileId !== null ? await getProfile(ownProfileId) : null;
  const [reminderPrefs, reminderDevices] =
    ownProfileId !== null ? await Promise.all([getPrefs(ownProfileId), countSubscriptionsForProfile(ownProfileId)]) : [null, 0];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-neutral-900">Settings</h1>

      {ownProfile && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Profile</p>
          <ProfileSettingsForm profile={ownProfile} isActive />
        </div>
      )}

      {ownProfile && <LocationSettingsForm profile={ownProfile} />}

      {ownProfile && reminderPrefs && (
        <PrayerRemindersForm
          initial={{
            enabled: reminderPrefs.enabled,
            prayers: prefsPrayers(reminderPrefs),
            leadMinutes: reminderPrefs.leadMinutes,
            followupMinutes: reminderPrefs.followupMinutes,
            quietStartMin: reminderPrefs.quietStartMin,
            quietEndMin: reminderPrefs.quietEndMin,
          }}
          devices={reminderDevices}
        />
      )}

      {household && <InviteCodeCard inviteCode={household.inviteCode} householdName={household.name} />}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-neutral-900">Appearance</p>
        <p className="mb-3 text-xs text-neutral-400">Choose a light or dark look. Applies to the whole app.</p>
        <ThemeToggle />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-neutral-900">Data</p>
        <p className="mb-3 text-xs text-neutral-400">
          Everything is stored locally on this device. Export a backup as JSON anytime.
        </p>
        <ExportDataButton />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-semibold text-neutral-900">About</p>
        <p className="text-xs text-neutral-400">
          Istiqamahly &mdash; local-first prayer tracker for the family. Hijri dates are
          calculated offline and may differ by a day from local moon-sighting announcements.
        </p>
      </div>
    </div>
  );
}
