import "server-only";
import { getOwnProfileId, requireAuth } from "@/lib/auth";
import { getActiveProfileId } from "@/lib/session";
import { getProfilesInHousehold } from "@/lib/db/repo";

export type FocusMemberLite = { id: number; name: string };

/**
 * Developer-only kill switch for circle visibility into Focus. Users have no setting for this —
 * flip the constant in code to bring cross-member viewing back. Off = every profile's Focus pages
 * (grove, stats, running session) are visible to themselves only, as if they were alone in the
 * household; the "Circle" switcher and viewer banner disappear too since they only ever see one
 * member (themselves).
 */
const CIRCLE_CAN_VIEW_FOCUS = true;

/**
 * Who the Focus pages are being shown for. When `CIRCLE_CAN_VIEW_FOCUS` is on, circle members can
 * view each other's grove, stats and running session, read only — so the read pages follow the
 * shared "active profile" cookie while mutations stay on your own profile. `readOnly` is true
 * whenever you're looking at someone else. When it's off, every caller is pinned to their own
 * profile regardless of that cookie.
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
  const allMembers = (await getProfilesInHousehold(session.householdId)).map((p) => ({ id: p.id, name: p.name }));

  if (!CIRCLE_CAN_VIEW_FOCUS) {
    const viewedId = ownId ?? allMembers[0].id;
    const viewedName = allMembers.find((m) => m.id === viewedId)?.name ?? "This member";
    return { ownId, viewedId, readOnly: ownId === null, members: allMembers.filter((m) => m.id === viewedId), viewedName };
  }

  const viewedId = await getActiveProfileId();
  const viewedName = allMembers.find((m) => m.id === viewedId)?.name ?? "This member";
  return { ownId, viewedId, readOnly: ownId === null || viewedId !== ownId, members: allMembers, viewedName };
}
