import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { loadGoalsData } from "@/lib/goal-data";
import { colorHex } from "@/lib/habits";
import { HabitIcon } from "@/components/habits/habit-icon";
import { StatusBadge } from "@/components/goals/goal-parts";
import { resolveMember } from "@/lib/goal-member";

export const metadata = { title: "Vision board" };

/** A visual board of your goals: the picture and the line you chose for each. */
export default async function VisionPage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const member = await resolveMember((await searchParams).member);
  const { views } = await loadGoalsData();
  const goals = views.filter((v) => (member ? v.goal.profileId === member.id : v.mine) && v.goal.status !== "dropped");

  return (
    <div className="flex flex-col gap-5 md:mx-auto md:max-w-4xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-h-muted">See it to be it</p>
        <h1 className="text-2xl font-extrabold tracking-tight">Vision board</h1>
        <p className="text-sm text-h-muted">{member ? `${member.name}'s shared goals, with the picture and line they chose.` : "Add a picture and a quote when you edit a goal and it shows up here."}</p>
      </div>

      {goals.length === 0 ? (
        <div className="h-card flex flex-col items-center gap-2 p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-h-brand-soft text-h-brand">
            <ImageIcon className="h-7 w-7" />
          </span>
          <p className="text-base font-extrabold">{member ? "Nothing shared yet" : "Your board is empty"}</p>
          <p className="text-sm text-h-muted">{member ? `${member.name} has not shared any goals.` : "Create a goal, then give it a picture and a line that moves you."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {goals.map((v) => {
            const hex = colorHex(v.goal.color);
            return (
              <Link
                key={v.goal.id}
                href={`/goals/${v.goal.id}`}
                className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-3xl shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: `linear-gradient(145deg, ${hex}, ${hex}99)` }}
              >
                {v.goal.imageData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.goal.imageData} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-white/30">
                    <HabitIcon name={v.goal.icon} className="h-20 w-20" />
                  </span>
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="relative flex flex-col gap-1 p-3 text-white">
                  <span className="flex items-center gap-1.5">
                    <StatusBadge status={v.goal.status} />
                    <span className="text-[11px] font-bold opacity-90">{Math.round(v.info.pct)}%</span>
                  </span>
                  <span className="line-clamp-2 break-words text-sm font-extrabold leading-snug">{v.goal.title}</span>
                  {v.goal.quote && <span className="line-clamp-3 break-words text-[11px] italic leading-snug opacity-90">&ldquo;{v.goal.quote}&rdquo;</span>}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
