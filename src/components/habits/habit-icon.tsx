import { Target } from "lucide-react";
import { HABIT_ICONS } from "@/lib/habit-icons";

/** Renders a habit/category icon from its stored string key. */
export function HabitIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const Icon = HABIT_ICONS[name] ?? Target;
  return <Icon className={className} style={style} />;
}
