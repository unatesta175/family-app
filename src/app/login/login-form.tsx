"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction } from "./actions";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="username"
          className="text-sm font-medium leading-none text-neutral-800 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="ilyas or anis"
          autoComplete="username"
          autoFocus
          required
          className="flex h-10 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 text-sm text-neutral-900 shadow-sm outline-none ring-offset-white transition-colors placeholder:text-neutral-400 focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium leading-none text-neutral-800">
            Password
          </label>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="flex h-10 w-full rounded-md border border-neutral-200 bg-transparent px-3 py-2 pr-10 text-sm text-neutral-900 shadow-sm outline-none ring-offset-white transition-colors placeholder:text-neutral-400 focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/30 disabled:cursor-not-allowed disabled:opacity-50"
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
    </form>
  );
}
