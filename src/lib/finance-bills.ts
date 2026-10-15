/** Pure date math for bill due dates — safe to import from client components (no "server-only"). */

export type BillFrequency = "monthly" | "yearly" | "once";

type BillLike = { frequency: BillFrequency; dueDay: number; dueMonth: number | null; dueDate: string | null };

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const pad2 = (n: number) => String(n).padStart(2, "0");

/** The yyyy-mm-dd this bill falls due within `month` (yyyy-mm), or null if it isn't due that month at all. */
export function billDueDateInMonth(bill: BillLike, month: string): string | null {
  const [y, m] = month.split("-").map(Number);
  const dim = daysInMonth(y, m);
  if (bill.frequency === "monthly") return `${month}-${pad2(Math.min(bill.dueDay, dim))}`;
  if (bill.frequency === "yearly") {
    if (bill.dueMonth !== m) return null;
    return `${month}-${pad2(Math.min(bill.dueDay, dim))}`;
  }
  return bill.dueDate && bill.dueDate.slice(0, 7) === month ? bill.dueDate : null;
}

/** The next occurrence on or after `today` (yyyy-mm-dd) — used to sort/label bills that aren't due this month. */
export function billNextOccurrence(bill: BillLike, today: string): string {
  if (bill.frequency === "once") return bill.dueDate ?? today;
  const [ty, tm] = today.slice(0, 7).split("-").map(Number);
  if (bill.frequency === "yearly") {
    const month = bill.dueMonth ?? 1;
    const day = Math.min(bill.dueDay, daysInMonth(ty, month));
    let candidate = `${ty}-${pad2(month)}-${pad2(day)}`;
    if (candidate < today) {
      const day2 = Math.min(bill.dueDay, daysInMonth(ty + 1, month));
      candidate = `${ty + 1}-${pad2(month)}-${pad2(day2)}`;
    }
    return candidate;
  }
  const day = Math.min(bill.dueDay, daysInMonth(ty, tm));
  let candidate = `${today.slice(0, 7)}-${pad2(day)}`;
  if (candidate < today) {
    const ny = tm === 12 ? ty + 1 : ty;
    const nm = tm === 12 ? 1 : tm + 1;
    const day2 = Math.min(bill.dueDay, daysInMonth(ny, nm));
    candidate = `${ny}-${pad2(nm)}-${pad2(day2)}`;
  }
  return candidate;
}
