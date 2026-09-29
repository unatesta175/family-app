import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-6 py-12">
      <Link
        href="/welcome"
        className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm transition-colors hover:border-neutral-300 hover:text-neutral-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      {/* soft ambient background, SaaS-login style */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,0.12), transparent), radial-gradient(40% 30% at 100% 100%, rgba(16,185,129,0.08), transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, black, transparent)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl shadow-sm shadow-emerald-900/10">
            <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Istiqamahly</h1>
            <p className="mt-1 text-sm text-neutral-500">Sign in to your family account</p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm shadow-black/[0.02]">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
