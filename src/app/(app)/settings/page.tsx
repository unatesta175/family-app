import { getProfile } from "@/lib/db/repo";
import { getOwnProfileId } from "@/lib/auth";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { ExportDataButton } from "@/components/export-data-button";

export default async function SettingsPage() {
  const ownProfileId = await getOwnProfileId();
  const ownProfile = ownProfileId !== null ? await getProfile(ownProfileId) : null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-neutral-900">Settings</h1>

      {ownProfile && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Profile</p>
          <ProfileSettingsForm profile={ownProfile} isActive />
        </div>
      )}

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
          Salah Tracker &mdash; local-first prayer tracker for the family. Hijri dates are
          calculated offline and may differ by a day from local moon-sighting announcements.
        </p>
      </div>
    </div>
  );
}
