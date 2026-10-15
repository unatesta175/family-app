import Link from "next/link";
import { Settings } from "lucide-react";
import { loadFinanceContext } from "@/lib/finance-data";
import { MORE_LINKS, withMemberQuery } from "@/lib/finance-nav-links";
import { FinanceSignOutRow } from "@/components/finance/finance-signout-row";

export const metadata = { title: "More" };

export default async function FinanceMorePage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const { member } = await searchParams;
  await loadFinanceContext(member);
  const q = member ? `?member=${member}` : "";
  const groups = ["Everyday", "Advanced"] as const;

  return (
    <div className="flex flex-col gap-6 md:mx-auto md:max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">More</h1>
        <Link
          href={withMemberQuery("/finance/settings", q)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>

      {groups.map((group) => {
        const links = MORE_LINKS.filter((l) => l.group === group);
        return (
          <section key={group} className="flex flex-col gap-2">
            <h2 className="px-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{group}</h2>
            <div className="grid grid-cols-4 gap-x-2 gap-y-4">
              {links.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={withMemberQuery(href, q)} className="flex flex-col items-center gap-1.5 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors active:bg-accent">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="text-[11px] font-semibold leading-tight text-foreground">{label}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <FinanceSignOutRow />

      <p className="pb-4 text-center text-xs text-muted-foreground">Istiqamahly Finance</p>
    </div>
  );
}
