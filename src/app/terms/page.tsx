import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Istiqamahly",
  description: "The terms for using Istiqamahly.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-neutral-50 px-6 py-16 text-neutral-800">
      <Link href="/welcome" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
        ← Back to Istiqamahly
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: September 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-neutral-700">
        <p>
          Istiqamahly is a free, self-hosted prayer-tracking app for families. By creating an
          account, you agree to the following.
        </p>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Your account</h2>
          <p className="mt-2">
            You&apos;re responsible for keeping your login credentials secure. Don&apos;t share your
            household&apos;s invite code with anyone you don&apos;t want seeing your family&apos;s prayer
            progress — anyone with the code can join your household.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Acceptable use</h2>
          <p className="mt-2">
            Use the app for its intended purpose: tracking your own prayers and viewing the
            progress of people in your household who chose to join it. Don&apos;t attempt to access
            data outside your household or misuse the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">No warranty</h2>
          <p className="mt-2">
            This app is provided as-is, maintained by a single developer. Prayer times are
            calculated using the adhan.js astronomical engine and, while accurate, should not be
            treated as a substitute for your local mosque&apos;s official announcements where they
            differ.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Changes</h2>
          <p className="mt-2">
            These terms may be updated as the app evolves. Continued use after a change means you
            accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Contact</h2>
          <p className="mt-2">
            Questions:{" "}
            <a href="mailto:muhammadilyasamran@gmail.com" className="font-semibold text-emerald-700">
              muhammadilyasamran@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
