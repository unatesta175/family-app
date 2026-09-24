import { Moon } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-50 px-6 py-12">
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
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm shadow-emerald-900/10">
            <Moon className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Salah Tracker</h1>
            <p className="mt-1 text-sm text-neutral-500">Sign in to your family account</p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm shadow-black/[0.02]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
