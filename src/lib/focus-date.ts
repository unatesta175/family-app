import "server-only";
import { cookies } from "next/headers";
import { localDateFrom } from "@/lib/focus";
import { nowMs } from "@/lib/now";

/** The visitor's zone offset in minutes, from the cookie the Focus pages set; the server's own zone until then. */
export async function tzOffset(): Promise<number> {
  const raw = (await cookies()).get("tzo")?.value;
  const n = Number(raw);
  return raw !== undefined && Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? n : new Date().getTimezoneOffset();
}

/** Today's date for the visitor, which can differ from the server's date for hours at a time. */
export async function focusToday(): Promise<string> {
  return localDateFrom(nowMs(), await tzOffset());
}
