import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import {
  MoonStar,
  ListChecks,
  Target,
  Sprout,
  Wallet,
  Sparkles,
  HeartHandshake,
  Flame,
  Users,
  Clock,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  Check,
  Mail,
  Code2,
  Link2,
  CalendarDays,
  Smartphone,
  Compass,
  Layers,
  Trees,
  type LucideIcon,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Istiqamahly — Your family's deen & discipline, in one private app",
  description:
    "Istiqamahly is a self-hosted family companion: precision prayer tracking, daily habits, life goals, and focus sessions — all in one app, on a server you own. Honest streaks, a garden that grows with your consistency, and read-only visibility for the whole family.",
};

const NAV_LINKS = [
  { href: "#modules", label: "Modules" },
  { href: "#features", label: "Why it's different" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#about", label: "About" },
];

const STATS = [
  { value: "4", label: "modules, one login" },
  { value: "12", label: "azan calculation methods" },
  { value: "100%", label: "self-hosted, your server" },
];

type Module = {
  key: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  tile: string;
  accent: string;
  points: string[];
};

const MODULES: Module[] = [
  {
    key: "prayer",
    name: "Prayer",
    tagline: "Salah, streaks & a living garden",
    icon: MoonStar,
    tile: "bg-emerald-100 text-emerald-700",
    accent: "text-emerald-700",
    points: [
      "Astronomically accurate azan times from your exact coordinates",
      "On-time, jamaah, qada or excused — logged with real nuance",
      "A 3D garden that grows with every consistent day",
    ],
  },
  {
    key: "habits",
    name: "Habits",
    tagline: "Build the good, break the rest — daily",
    icon: ListChecks,
    tile: "bg-indigo-100 text-indigo-600",
    accent: "text-indigo-600",
    points: [
      "Yes/no, counted or timer-based habits, tracked per day",
      "A research-backed habit-science guide built in",
      "Honest streaks and stats that don't let you fudge the count",
    ],
  },
  {
    key: "goals",
    name: "Goals",
    tagline: "Life goals, milestones & weekly reviews",
    icon: Target,
    tile: "bg-amber-100 text-amber-600",
    accent: "text-amber-600",
    points: [
      "Organise goals by life area with milestones and progress",
      "Ideas, active, paused or achieved — your whole vision in view",
      "A weekly review ritual that keeps long-term goals alive",
    ],
  },
  {
    key: "focus",
    name: "Focus",
    tagline: "Deep work, one tree at a time",
    icon: Sprout,
    tile: "bg-green-100 text-green-700",
    accent: "text-green-700",
    points: [
      "Start a focus session and grow a real tree as you concentrate",
      "Sessions feed a grove you can look back on over months",
      "Link a timer habit and your focus time counts toward it",
    ],
  },
];

const COMING_SOON = [
  { label: "Finance", hint: "Family budgeting & sadaqah", icon: Wallet },
  { label: "Sunnah", hint: "Revive the daily sunnahs", icon: Sparkles },
  { label: "Akhlaq", hint: "Character & manners", icon: HeartHandshake },
];

const FEATURES = [
  {
    icon: Layers,
    tone: "bg-sky-100 text-sky-700",
    title: "One app, not five",
    body:
      "Prayer, Habits, Goals and Focus share one login, one family, one database. Switch modules in a tap — no juggling four separate apps that never talk to each other.",
    big: true,
  },
  {
    icon: Users,
    tone: "bg-rose-100 text-rose-700",
    title: "Built for the whole family",
    body: "Separate profiles per member, with read-only visibility so family can encourage without editing each other's logs.",
  },
  {
    icon: Flame,
    tone: "bg-orange-100 text-orange-700",
    title: "Streaks with integrity",
    body: "No fudging the count. Miss a day, see it — across every module, not just prayer.",
  },
  {
    icon: ShieldCheck,
    tone: "bg-violet-100 text-violet-700",
    title: "Your data never leaves your server",
    body: "No third-party account, no ad network, no analytics pipeline. Self-hosted on infrastructure you control.",
  },
  {
    icon: CalendarDays,
    tone: "bg-amber-100 text-amber-700",
    title: "Hijri calendar & full history",
    body: "Every log, every month, charted — with a Hijri date alongside the Gregorian one, always in view.",
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
    title: "Set up once",
    body: "Create your family, grant location access for accurate azan times, and your coordinates and timezone are saved — forever.",
  },
  {
    icon: Check,
    title: "Track across modules",
    body: "Log a prayer, tick a habit, nudge a goal, or start a focus session — each one a single tap from a bottom nav that stays uncluttered.",
  },
  {
    icon: Sparkles,
    title: "Watch consistency compound",
    body: "Streaks build, the garden fills in, the grove grows, and your family's history becomes something you can actually see.",
  },
];

export default async function WelcomePage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="prayer-theme relative min-h-screen overflow-x-hidden bg-neutral-50 text-neutral-900">
      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/70 bg-neutral-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
              <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="h-full w-full object-cover" />
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
          <div className="flex items-center gap-2">
            <Link
              href="/register"
              className="hidden items-center gap-1 rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-400 sm:flex"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-1 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(55% 45% at 50% 0%, rgba(16,185,129,0.16), transparent), radial-gradient(35% 25% at 100% 10%, rgba(99,102,241,0.10), transparent)",
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
          <div className="lp-rise">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Layers className="h-3.5 w-3.5" />
              Four modules · one private app
            </div>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-neutral-900 sm:text-5xl">
              Your family&apos;s{" "}
              <span className="text-emerald-700">deen</span> and{" "}
              <span className="text-emerald-700">discipline</span>, in one place.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-relaxed text-neutral-500">
              Istiqamahly brings prayer tracking, daily habits, life goals, and focus sessions
              together in a single self-hosted app. Honest streaks, a garden that grows with your
              consistency, and read-only visibility for the whole family — all on a server you own,
              not someone else&apos;s cloud.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-800"
              >
                Start or join a family
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <a
                href="#modules"
                className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition-colors hover:border-neutral-400"
              >
                Explore the modules
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

          {/* Product visual: stylized app mockup with the module switcher front and centre */}
          <div className="lp-rise relative mx-auto w-full max-w-sm" style={{ animationDelay: "120ms" }}>
            <div aria-hidden className="lp-aura absolute -inset-6 -z-10 rounded-[2.5rem] bg-emerald-200/40 blur-3xl" />
            <div className="lp-float rounded-[2rem] border border-neutral-200 bg-white p-3 shadow-xl shadow-neutral-900/10">
              <div className="rounded-[1.5rem] bg-neutral-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 pr-3 shadow-sm">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <MoonStar className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-neutral-800">Prayer</span>
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
                          <MoonStar className="h-3.5 w-3.5" />
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

                {/* Module quick-switch row, echoing the in-app switcher */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-2">
                  {MODULES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <span
                        key={m.key}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.tile}`}
                        title={m.name}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Modules ---------- */}
      <section id="modules" className="border-t border-neutral-200 bg-white py-20">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">The modules</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-900">
              Istiqamahly is more than a prayer tracker.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              It&apos;s a growing suite of modules for the things a Muslim family wants to stay
              steadfast on — each one purpose-built, all sharing one family, one login, and one
              private database.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <div
                  key={m.key}
                  className="group flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm shadow-black/[0.02] transition-colors hover:border-neutral-300"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${m.tile}`}>
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-base font-extrabold tracking-tight text-neutral-900">{m.name}</p>
                      <p className={`text-xs font-semibold ${m.accent}`}>{m.tagline}</p>
                    </div>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {m.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm leading-relaxed text-neutral-600">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${m.accent}`} strokeWidth={2.5} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Coming soon */}
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">On the roadmap</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {COMING_SOON.map(({ label, hint, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-800">{label}</p>
                    <p className="text-[11px] leading-tight text-neutral-400">{hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Why it's different (features) ---------- */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Why it&apos;s different</p>
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
              Istiqamahly is built and maintained end to end by one developer — every module, the
              database schema, the astronomical calculation engine, the 3D garden and focus grove,
              the deployment pipeline to a self-hosted VPS, all of it. It started as a way to hold
              his own family accountable to their five daily prayers, and grew into a full suite
              because steadfastness — in prayer, habits, goals and focus alike — deserves tooling
              that&apos;s actually accurate, not a spreadsheet with a checkbox.
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
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Trees className="h-3.5 w-3.5" />
              Prayer · Habits · Goals · Focus
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Steadfastness starts with one tap.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-neutral-300">
              Create your family, set your location, and your first accurate azan time — and your
              first habit, goal and focus session — are a minute away.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-500"
              >
                Start or join a family
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10"
              >
                Sign in
              </Link>
            </div>
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
            Self-hosted &middot; No ads &middot; No tracking
          </p>
        </div>
      </footer>
    </div>
  );
}
