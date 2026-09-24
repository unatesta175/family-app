"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";

export async function loginAction(_prevState: { error: string } | null, formData: FormData) {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await login(username, password);
  if (!result.ok) {
    return { error: result.error };
  }

  redirect("/");
}
