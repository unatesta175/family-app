"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "./actions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "@/components/google-signin-button";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured: "Google sign-in isn't set up yet.",
  google_state_mismatch: "That sign-in attempt expired. Please try again.",
  google_token_exchange_failed: "Couldn't confirm your Google sign-in. Please try again.",
  google_profile_fetch_failed: "Couldn't read your Google profile. Please try again.",
  google_email_unverified: "Your Google email isn't verified — please verify it and try again.",
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const oauthErrorMessage = oauthError ? GOOGLE_ERROR_MESSAGES[oauthError] ?? oauthError : null;

  return (
    <div className="flex flex-col gap-5">
      {oauthErrorMessage && (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{oauthErrorMessage}</span>
        </div>
      )}

      <GoogleSignInButton />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs font-medium text-neutral-400">or</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-sm font-medium leading-none text-neutral-800 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Username
        </label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="Enter your username"
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium leading-none text-neutral-800">
            Password
          </label>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-neutral-400 hover:text-neutral-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 text-sm font-semibold text-white shadow-sm transition-colors",
          "hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-60"
        )}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-neutral-500">
        New here?{" "}
        <a href="/register" className="font-semibold text-emerald-700 hover:text-emerald-800">
          Join or start a family
        </a>
      </p>
      </form>
    </div>
  );
}
