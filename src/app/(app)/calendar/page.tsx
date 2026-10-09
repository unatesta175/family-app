import { todayIso } from "@/lib/date";
import { IslamicCalendar } from "@/components/islamic-calendar";

export const metadata = { title: "Islamic Calendar" };

export default function CalendarPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-neutral-900">Islamic calendar</h1>
        <p className="text-xs text-neutral-400">Gregorian and Hijri dates, with sacred days and recommended observances.</p>
      </div>
      <IslamicCalendar todayIso={todayIso()} />
    </div>
  );
}
