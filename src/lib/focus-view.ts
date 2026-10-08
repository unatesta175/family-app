import "server-only";
import { getOwnProfileId, requireAuth } from "@/lib/auth";
import { getActiveProfileId } from "@/lib/session";
import { getProfilesInHousehold } from "@/lib/db/repo";

export type FocusMemberLite = { id: number; name: string };

/**
 * Who the Focus pages are being shown for. Circle members can view each other's grove, stats and
 * running session, read only — so the read pages follow the shared "active profile" cookie while
 * mutations stay on your own profile. `readOnly` is true whenever you're looking at someone else.
 */
export async function focusViewer(): Promise<{
  ownId: number | null;
  viewedId: number;
  readOnly: boolean;
  members: FocusMemberLite[];
  viewedName: string;
}> {
  const session = await requireAuth();
  const ownId = await getOwnProfileId();
  const viewedId = await getActiveProfileId();
  const members = (await getProfilesInHousehold(session.householdId)).map((p) => ({ id: p.id, name: p.name }));
  const viewedName = members.find((m) => m.id === viewedId)?.name ?? "This member";
  return { ownId, viewedId, readOnly: ownId === null || viewedId !== ownId, members, viewedName };
}
