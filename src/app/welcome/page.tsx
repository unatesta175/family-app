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
  ArrowUpRight,
  Check,
  Mail,
  Code2,
  Link2,
  Sparkles,
  CalendarDays,
  Smartphone,
  Compass,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Istiqamahly — Steadfast, one prayer at a time",
  description:
    "A precision prayer tracker with astronomically accurate, location-aware azan times, honest streaks, and a garden that grows with your family's consistency.",
};

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#about", label: "About" },
];

const STATS = [
  { value: "12", label: "calculation methods" },
  { value: "5×", label: "daily prayers tracked" },
  { value: "100%", label: "self-hosted, your server" },
];

const FEATURES = [
  {
    icon: Clock,
    tone: "bg-sky-100 text-sky-700",
    title: "Astronomically accurate azan times",
    body:
      "Real solar-position calculation from your exact coordinates via the adhan.js engine — not a static table. Choose from 12 regional authorities, your madhab, and it auto-adjusts for high-latitude locations.",
    big: true,
  },
  {
    icon: Sprout,
    tone: "bg-emerald-100 text-emerald-700",
    title: "A garden that grows with you",
    body: "Every consistent day plants and grows a real 3D scene — a visual, honest reflection of your habit over time.",
  },
  {
    icon: Flame,
    tone: "bg-orange-100 text-orange-700",
    title: "Streaks with integrity",
    body: "No fudging the count. Miss a day, see it. On-time, jamaah, qada, or excused — all tracked precisely.",
  },
  {
    icon: Users,
    tone: "bg-rose-100 text-rose-700",
    title: "Built for the whole family",
    body: "Separate profiles per member, with read-only visibility so family can encourage without editing each other's logs.",
  },
  {
    icon: CalendarDays,
    tone: "bg-amber-100 text-amber-700",
    title: "Hijri calendar & full history",
    body: "Every log, every month, charted — with a Hijri date alongside the Gregorian one, always in view.",
  },
  {
    icon: ShieldCheck,
    tone: "bg-violet-100 text-violet-700",
    title: "Your data never leaves your server",
    body: "No third-party account, no ad network, no analytics pipeline. Self-hosted on infrastructure you control.",
  },
  {
    icon: Smartphone,
    tone: "bg-teal-100 text-teal-700",
    title: "Installs like a native app",
    body: "A full offline-capable PWA — add it to your home screen and it behaves like any other app.",
  },
];

const STEPS = [
  {
    icon: Compass,
    title: "Set your location once",
    body: "One tap grants location access. Your coordinates and timezone are saved — azan times recalculate automatically, every day, forever.",
  },
  {
    icon: Check,
    title: "Log each prayer as it happens",
    body: "On time, in jamaah, late, qada, or excused — one tap logs it with the nuance that a simple checkbox can't capture.",
  },
  {
    icon: Sparkles,
    title: "Watch your consistency compound",
    body: "Streaks build, the garden fills in, and the family's history becomes something you can actually see, not just remember.",
  },
];

export default function WelcomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-50 text-neutral-900">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <Moon className="h-4 w-4" strokeWidth={2.4} />
            </div>
            <span className="text-[15px] font-extrabold tracking-tight">Istiqamahly</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Link
            href="/login"
            className="flex items-center gap-1 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(55% 45% at 50% 0%, rgba(16,185,129,0.16), transparent), radial-gradient(35% 25% at 100% 10%, rgba(16,185,129,0.10), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black, transparent)",
          }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-6 pb-20 pt-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pb-28 md:pt-24">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Sparkles className="h-3.5 w-3.5" />
              Designed and built solo, obsessively
            </div>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl">
              Prayer tracking that respects
              <span className="text-emerald-700"> your time</span> and{" "}
              <span className="text-emerald-700">your data</span>.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-neutral-500">
              Istiqamahly calculates real azan times from your coordinates, tracks every prayer
              with honest nuance, and turns your family&apos;s consistency into a garden you can
              watch grow — all running on a server you own, not someone else&apos;s cloud.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-800"
              >
                Sign in to your family
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition-colors hover:border-neutral-400"
              >
                See what&apos;s inside
              </a>
            </div>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-4 border-t border-neutral-200 pt-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <dt className="text-2xl font-extrabold tracking-tight text-neutral-900">{s.value}</dt>
                  <dd className="mt-0.5 text-xs leading-snug text-neutral-500">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Product visual: stylized app mockup, no fake data claims */}
          <div className="relative mx-auto w-full max-w-sm">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-emerald-200/40 blur-3xl"
            />
            <div className="rounded-[2rem] border border-neutral-200 bg-white p-3 shadow-xl shadow-neutral-900/10">
              <div className="rounded-[1.5rem] bg-neutral-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                      Good evening
                    </p>
                    <p className="text-lg font-extrabold text-neutral-900">Ilyas</p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <Flame className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-neutral-900 px-4 py-3 text-white">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                    <Clock className="h-4 w-4 text-rose-700" />
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-300">Next: Maghrib at 6:04 PM</p>
                    <p className="text-sm font-extrabold tabular-nums">42m 18s</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  {[
                    { label: "Fajr", tone: "bg-sky-100 text-sky-700", done: true },
                    { label: "Dhuhr", tone: "bg-amber-100 text-amber-700", done: true },
                    { label: "Asr", tone: "bg-orange-100 text-orange-700", done: false },
                  ].map((p) => (
                    <div
                      key={p.label}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${p.tone}`}>
                          <Moon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-800">{p.label}</span>
                      </div>
                      {p.done ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-neutral-300">Not yet</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Features</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
            Everything a family needs, nothing it doesn&apos;t.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500">
            Every feature exists because it solved a real problem for a real family — not because
            a roadmap said so.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm shadow-black/[0.02] ${
                  f.big ? "md:col-span-2" : ""
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.tone}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <p className="text-sm font-bold text-neutral-900">{f.title}</p>
                <p className="text-sm leading-relaxed text-neutral-500">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="border-y border-neutral-200 bg-white py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
              Three steps. No setup fatigue.
            </h2>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <span className="text-xs font-bold text-neutral-300">0{i + 1}</span>
                  </div>
                  <p className="mt-4 text-sm font-bold text-neutral-900">{step.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- About the developer ---------- */}
      <section id="about" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="grid gap-10 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm shadow-black/[0.02] md:grid-cols-[auto_1fr] md:p-12">
          <div className="flex justify-center md:justify-start">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-extrabold text-white">
              MI
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">About the developer</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-neutral-900">
              Muhammad Ilyas Bin Amran
            </h2>
            <p className="text-sm font-semibold text-neutral-400">Sole Developer &amp; Maintainer</p>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-600">
              Istiqamahly is built and maintained end to end by one developer — the database
              schema, the astronomical calculation engine, the 3D garden, the deployment pipeline
              to a self-hosted VPS, all of it. It started as a way to hold his own family
              accountable to their five daily prayers, and grew into a full product because a
              habit worth tracking deserves tooling that&apos;s actually accurate, not a
              spreadsheet with a checkbox.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                href="mailto:muhammadilyasamran@gmail.com"
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-100"
              >
                <Mail className="h-3.5 w-3.5" />
                muhammadilyasamran@gmail.com
              </a>
              <a
                href="https://github.com/unatesta175"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-100"
              >
                <Code2 className="h-3.5 w-3.5" />
                @unatesta175
                <ArrowUpRight className="h-3 w-3 text-neutral-400" />
              </a>
              <span className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-neutral-500">
                <Link2 className="h-3.5 w-3.5" />
                LinkedIn: Muhammad Ilyas Bin Amran
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-neutral-900 px-8 py-14 text-center sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(50% 60% at 50% 0%, rgba(16,185,129,0.35), transparent)",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Steadfastness starts with one prayer.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-neutral-300">
              Sign in and set your location — your first accurate azan time is a minute away.
            </p>
            <Link
              href="/login"
              className="mt-7 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-500"
            >
              Sign in to your family
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <Image src="/icons/icon-192.png" alt="" width={20} height={20} className="rounded-md" />
            <p className="text-xs font-medium text-neutral-400">
              &copy; {new Date().getFullYear()} Istiqamahly &middot; Built by Muhammad Ilyas Bin Amran
            </p>
          </div>
          <p className="text-[11px] font-medium text-neutral-400">
            Local-first &middot; No ads &middot; No tracking
          </p>
        </div>
      </footer>
    </div>
  );
}
