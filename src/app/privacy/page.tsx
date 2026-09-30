import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Istiqamahly",
  description: "What Istiqamahly stores, why, and who can see it.",
};

export default function PrivacyPage() {
  return (
    <div className="prayer-theme mx-auto min-h-screen max-w-2xl bg-neutral-50 px-6 py-16 text-neutral-800">
      <Link href="/welcome" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
        ← Back to Istiqamahly
      </Link>

      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-neutral-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: September 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-neutral-700">
        <p>
          Istiqamahly is a prayer-tracking app for families. This page explains what data it
          stores, why, and who can see it.
        </p>

        <section>
          <h2 className="text-base font-bold text-neutral-900">What we store</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>Your account: a username, a hashed password (or your Google account ID if you sign in with Google), and the email address Google shares with us.</li>
            <li>Your profile: a display name, and optional details you choose to add (age, gender, date of birth, location coordinates for prayer-time calculation).</li>
            <li>Your prayer logs: which of the five daily prayers you marked, when, and their status (on time, jamaah, late, qada, missed, excused).</li>
            <li>Household membership: which family/household your account belongs to.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Who can see it</h2>
          <p className="mt-2">
            Only members of the same household as you — people who joined using your household&apos;s
            invite code — can see your prayer progress. Nobody outside your household can see your
            data. We don&apos;t sell, share, or use your data for advertising, and there is no
            third-party analytics or tracking pipeline in this app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Google sign-in</h2>
          <p className="mt-2">
            If you sign in with Google, we only request your basic profile (name, email, and a
            unique account identifier) to create or match your account. We never see or store your
            Google password, and we don&apos;t access anything else in your Google account.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Where it&apos;s stored</h2>
          <p className="mt-2">
            This app is self-hosted — your data lives on a server the developer controls directly,
            not a third-party cloud analytics or ad platform.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Deleting your data</h2>
          <p className="mt-2">
            Email{" "}
            <a href="mailto:muhammadilyasamran@gmail.com" className="font-semibold text-emerald-700">
              muhammadilyasamran@gmail.com
            </a>{" "}
            to request deletion of your account and all associated data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-neutral-900">Contact</h2>
          <p className="mt-2">
            Questions about this policy: {" "}
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
