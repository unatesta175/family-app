import { loadPlannerData } from "@/lib/time-data";
import { TimePlanner } from "@/components/goals/time-planner";
import { resolveMember } from "@/lib/goal-member";

export const metadata = { title: "Daily clock" };

/** Plan your usual day on a 24-hour clock and see how your hours add up. */
export default async function TimePage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const member = await resolveMember((await searchParams).member);
  const data = await loadPlannerData(member?.id);
  return <TimePlanner data={data} readOnly={!!member} memberName={member?.name} />;
}
