import "server-only";
import { requireAuth, getOwnProfileId } from "@/lib/auth";
import { getProfilesInHousehold } from "@/lib/db/repo";
import { todayIso } from "@/lib/date";
import {
  getAccountsByProfiles,
  getCategoriesByProfile,
  getBudgetSettings,
  seedCategoriesForProfile,
  type AccountRow,
  type CategoryRow,
  type BudgetSettingsRow,
} from "@/lib/db/repo-finance";

export type FinanceMember = { id: number; name: string; isMe?: boolean };

/** Resolves `?member=<id>` into the household profile being viewed (null when it's the caller's own). */
export async function resolveFinanceMember(raw: string | undefined): Promise<FinanceMember | null> {
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id <= 0) return null;
  const session = await requireAuth();
  const own = await getOwnProfileId();
  if (id === own) return null;
  const profile = (await getProfilesInHousehold(session.householdId)).find((p) => p.id === id);
  return profile ? { id: profile.id, name: profile.name } : null;
}

/**
 * Core context every Finance page needs: who's logged in, whose data is being viewed, and whether
 * that view is read-only (a partner's). Accounts/transactions queried elsewhere are filtered by
 * `visibleProfileIds` + `readOnly` as appropriate.
 */
export type FinanceContext = {
  today: string;
  viewerId: number; // caller's own profile id
  viewingId: number; // the profile whose data this page shows
  readOnly: boolean; // true when viewing a partner's shared-only data
  household: { id: number; name: string }[];
  accounts: AccountRow[];
  categories: CategoryRow[];
  budget: BudgetSettingsRow | null;
};

export async function loadFinanceContext(memberRaw: string | undefined): Promise<FinanceContext> {
  const session = await requireAuth();
  const ownId = await getOwnProfileId();
  if (ownId === null) throw new Error("No profile for this account.");

  const household = await getProfilesInHousehold(session.householdId);
  const member = await resolveFinanceMember(memberRaw);
  const viewingId = member?.id ?? ownId;
  const readOnly = viewingId !== ownId;

  await seedCategoriesForProfile(ownId);

  const [accounts, categories, budget] = await Promise.all([
    getAccountsByProfiles([viewingId]),
    getCategoriesByProfile(viewingId),
    getBudgetSettings(viewingId),
  ]);

  return {
    today: todayIso(),
    viewerId: ownId,
    viewingId,
    readOnly,
    household: household.map((p) => ({ id: p.id, name: p.name })),
    accounts: readOnly ? accounts.filter((a) => a.isShared) : accounts,
    categories,
    budget,
  };
}

/** Everyone in the household, you first — for the "whose finances" switcher. */
export async function listFinanceMembers(): Promise<FinanceMember[]> {
  const session = await requireAuth();
  const own = await getOwnProfileId();
  return (await getProfilesInHousehold(session.householdId))
    .map((p) => ({ id: p.id, name: p.name, isMe: p.id === own }))
    .sort((a, b) => Number(!!b.isMe) - Number(!!a.isMe));
}
