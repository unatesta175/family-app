"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { registerAction } from "./actions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { GoogleSignInButton } from "@/components/google-signin-button";

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");

  return (
    <div className="flex flex-col gap-5">
      <GoogleSignInButton />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs font-medium text-neutral-400">or</span>
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="displayName" className="text-sm font-medium leading-none text-neutral-800">
          Your name
        </label>
        <Input id="displayName" name="displayName" type="text" placeholder="e.g. Ilyas" autoFocus required />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="text-sm font-medium leading-none text-neutral-800">
          Username
        </label>
        <Input
          id="username"
          name="username"
          type="text"
          placeholder="letters, numbers, underscores"
          autoComplete="username"
          pattern="[a-zA-Z0-9_]+"
          minLength={3}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium leading-none text-neutral-800">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-medium leading-none text-neutral-800">
          Confirm password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium leading-none text-neutral-800">Family</span>
        <input type="hidden" name="householdMode" value={mode} />
        <div className="grid grid-cols-2 gap-1 rounded-md bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={cn(
              "rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "create" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            Start a new family
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={cn(
              "rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-colors",
              mode === "join" ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            Join with invite code
          </button>
        </div>

        {mode === "create" ? (
          <Input name="householdName" type="text" placeholder="Family name (optional)" />
        ) : (
          <Input
            name="inviteCode"
            type="text"
            placeholder="Invite code"
            className="uppercase"
            required={mode === "join"}
          />
        )}
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
        {isPending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <a href="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
          Sign in
        </a>
      </p>
      </form>
    </div>
  );
}
