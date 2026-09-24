"use client";

import { useState } from "react";
import { BookOpen, RefreshCw } from "lucide-react";
import type { Quote } from "@/lib/quotes";

export function QuoteCard({ quotes, initialIndex }: { quotes: Quote[]; initialIndex: number }) {
  const [index, setIndex] = useState(initialIndex);
  const quote = quotes[index];

  function next() {
    setIndex((prev) => {
      if (quotes.length <= 1) return prev;
      let nextIndex = Math.floor(Math.random() * quotes.length);
      while (nextIndex === prev) nextIndex = Math.floor(Math.random() * quotes.length);
      return nextIndex;
    });
  }

  return (
    <div className="mt-1 flex gap-3 rounded-2xl bg-emerald-800 p-4 text-white">
      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
      <div className="flex-1">
        <p className="text-sm italic leading-snug">&ldquo;{quote.text}&rdquo;</p>
        <p className="mt-1 text-[11px] font-medium text-emerald-300">{quote.ref}</p>
      </div>
      <button
        type="button"
        onClick={next}
        aria-label="Show another quote"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-emerald-200 transition-colors hover:bg-white/20"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
