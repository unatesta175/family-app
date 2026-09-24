"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** Renders the current time and keeps it ticking every second on the client. */
export function LiveClock({ initial }: { initial: string }) {
  const [label, setLabel] = useState(initial);

  useEffect(() => {
    const id = setInterval(() => {
      setLabel(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 shadow-sm">
      <Clock className="h-3 w-3 text-neutral-400" />
      {label}
    </span>
  );
}
