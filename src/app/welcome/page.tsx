import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  Moon,
  Flame,
  Sprout,
  Users,
  Clock,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Istiqamahly — Steadfast, one prayer at a time",
  description:
    "A family prayer tracker with accurate, location-aware azan times, streaks, and a growing garden that reflects your consistency.",
};

const FEATURES = [
  {
    icon: Clock,
    tone: "bg-sky-100 text-sky-700",
    title: "Accurate azan times",
    body:
      "Real astronomical calculation from your exact coordinates — not a fixed table. Recalculated every day, adjusted to your calculation method and madhab.",
  },
  {
    icon: Flame,
    tone: "bg-orange-100 text-orange-700",
    title: "Streaks that matter",
    body: "Every prayer, on time or made up, builds your streak. Miss a day and see it honestly — no fudging the count.",
  },
  {
    icon: Sprout,
    tone: "bg-emerald-100 text-emerald-700",
    title: "A garden that grows with you",
    body: "Consistency isn't just a number. Watch a real 3D garden fill in, month by month, as a living reflection of your habit.",
  },
  {
    icon: Users,
    tone: "bg-rose-100 text-rose-700",
    title: "Built for the whole family",
    body: "Separate profiles for everyone, with a read-only view so family can encourage each other without editing one another's logs.",
  },
  {
    icon: ShieldCheck,
    tone: "bg-violet-100 text-violet-700",
    title: "Your data, your server",
    body: "No third-party account, no ads, no analytics. Everything lives on infrastructure you control.",
  },
];

export default function WelcomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-neutral-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.14), transparent), radial-gradient(40% 30% at 100% 100%, rgba(16,185,129,0.08), transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-xl flex-col items-center px-6 pb-16 pt-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/10">
          <Moon className="h-7 w-7" strokeWidth={2.2} />
        </div>

        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-neutral-900">
          Istiqamahly
        </h1>
        <p className="mt-3 max-w-sm text-balance text-sm leading-relaxed text-neutral-500">
          Steadfastness, one prayer at a time. Track your five daily prayers with real azan
          times, honest streaks, and a garden that grows with your family&apos;s consistency.
        </p>

        <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-800"
          >
            Sign in to your family
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="mt-14 grid w-full gap-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="flex items-start gap-3.5 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm shadow-black/[0.02]"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${f.tone}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900">{f.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{f.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-2 opacity-70">
          <Image src="/icons/icon-192.png" alt="" width={20} height={20} className="rounded-md" />
          <p className="text-[11px] font-medium text-neutral-400">
            Local-first &middot; No ads &middot; No tracking
          </p>
        </div>
      </div>
    </div>
  );
}
