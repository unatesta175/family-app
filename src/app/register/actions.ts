"use server";

import { redirect } from "next/navigation";
import { register } from "@/lib/auth";

export async function registerAction(_prevState: { error: string } | null, formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "");
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const mode = String(formData.get("householdMode") ?? "create");

  if (password !== confirmPassword) {
    return { error: "Passwords don't match." };
  }

  const household =
    mode === "join"
      ? ({ mode: "join", inviteCode: String(formData.get("inviteCode") ?? "") } as const)
      : ({ mode: "create", name: String(formData.get("householdName") ?? "") } as const);

  const result = await register({ displayName, username, password, household });
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/");
}
