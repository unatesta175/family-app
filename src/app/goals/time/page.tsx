import { loadPlannerData } from "@/lib/time-data";
import { TimePlanner } from "@/components/goals/time-planner";

export const metadata = { title: "Daily clock" };

/** Plan your usual day on a 24-hour clock and see how your hours add up. */
export default async function TimePage() {
  const data = await loadPlannerData();
  return <TimePlanner data={data} />;
}
