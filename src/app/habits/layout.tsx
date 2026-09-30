import { ModuleSwitcher } from "@/components/module-switcher";
import { AddFab } from "@/components/habits/add-fab";
import { HabitBottomNav, HabitSidebar } from "@/components/habits/habit-nav";
import { HabitLogout, HabitProfileSwitcher, HabitThemeToggle } from "@/components/habits/habit-header-controls";
import { getActiveProfileId } from "@/lib/session";
import { requireAuth, getOwnProfileId } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { getCategories } from "@/lib/db/repo-habits";

/**
 * Habit tracker shell. Deliberately its own layout with its own theme tokens (`.habits-theme`,
 * see globals.css): cool indigo SaaS look, sidebar on desktop, bottom bar on phones — nothing
 * shared with the prayer module's green chrome except auth and the profile/household model.
 */
export default async function HabitsLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();
  const [profiles, activeProfileId, ownProfileId] = await Promise.all([
    getProfilesInHousehold(session.householdId),
    getActiveProfileId(),
    getOwnProfileId(),
  ]);
  const readOnly = ownProfileId === null || activeProfileId !== ownProfileId;
  const viewing = profiles.find((p) => p.id === activeProfileId);
  const categories = readOnly ? [] : await getCategories(activeProfileId);

  return (
    <div className="habits-theme flex min-h-dvh flex-1 flex-col bg-h-bg text-h-fg">
      <div className="mx-auto flex w-full max-w-md flex-1 lg:max-w-6xl lg:flex-row">
        <HabitSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex flex-col gap-2 bg-h-bg/90 px-4 pb-2 pt-4 backdrop-blur lg:px-8">
            <div className="flex items-center justify-between gap-2">
              <ModuleSwitcher current="habits" tone="habits" />
              <div className="flex items-center gap-2">
                <HabitProfileSwitcher
                  profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
                  activeProfileId={activeProfileId}
                />
                <HabitThemeToggle />
                <HabitLogout />
              </div>
            </div>
            {readOnly && (
              <p className="self-end rounded-full bg-h-break-soft px-3 py-1 text-[11px] font-bold text-h-break">
                Viewing {viewing?.name ?? "family member"} — read only
              </p>
            )}
          </header>
          <main className="flex-1 px-4 pb-28 pt-2 lg:px-8 lg:pb-12">{children}</main>
          {!readOnly && <AddFab categories={categories} />}
          <HabitBottomNav />
        </div>
      </div>
    </div>
  );
}
