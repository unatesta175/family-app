import { BottomNav } from "@/components/bottom-nav";
import { ProfileSwitcher } from "@/components/profile-switcher";
import { LogoutButton } from "@/components/logout-button";
import { getActiveProfileId } from "@/lib/session";
import { requireAuth, getOwnProfileId } from "@/lib/auth";
import { getProfiles } from "@/lib/db/repo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const [profiles, activeProfileId, ownProfileId] = await Promise.all([
    getProfiles(),
    getActiveProfileId(),
    getOwnProfileId(),
  ]);
  const viewingPartner = ownProfileId !== null && activeProfileId !== ownProfileId;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col bg-background">
      <header className="sticky top-0 z-10 flex flex-col gap-2 bg-background px-4 pt-4">
        <div className="flex items-center justify-end gap-2">
          <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} />
          <LogoutButton />
        </div>
        {viewingPartner && (
          <p className="self-end rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
            Viewing partner — read only
          </p>
        )}
      </header>
      <main className="flex-1 px-4 pb-24 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
