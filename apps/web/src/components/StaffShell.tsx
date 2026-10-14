"use client";

import { useStore } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "./ui";

const groups = [
  { title: "Workspace", items: [{ href: "/staff", label: "Today" }] },
  {
    title: "Operations",
    items: [
      { href: "/staff/queue", label: "Booking and queue" },
      { href: "/staff/intake", label: "Weigh-in and slips" },
      { href: "/staff/processing", label: "Drying and milling" },
    ],
  },
  {
    title: "Sales and costs",
    items: [
      { href: "/staff/sales", label: "Sales and receipts" },
      { href: "/staff/costing", label: "Real-time costing" },
      { href: "/staff/financials", label: "Financials and energy" },
    ],
  },
  {
    title: "Planning",
    items: [
      { href: "/staff/forecast", label: "Harvest forecast" },
      { href: "/staff/pricing", label: "Pricing and rates" },
    ],
  },
  { title: "Traceability", items: [{ href: "/staff/traceability", label: "Batch search" }] },
  {
    title: "Administration",
    items: [
      { href: "/staff/users", label: "Users and roles" },
      { href: "/staff/audit", label: "Audit log" },
    ],
  },
];

function Menu({ onPick }: { onPick?: () => void }) {
  const path = usePathname();
  const on = (href: string) => (href === "/staff" ? path === href : path.startsWith(href));

  return (
    <nav className="flex flex-col gap-6" aria-label="Staff navigation">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">{group.title}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onPick}
              aria-current={on(item.href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-xl px-3 text-sm transition-colors",
                on(item.href) ? "bg-husk font-bold text-ink" : "text-white/85 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export default function StaffShell({ children }: { children: ReactNode }) {
  const { isMock } = useStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 overflow-y-auto bg-ink px-4 py-6 text-white lg:flex">
        <Link href="/staff" className="flex min-h-11 items-center gap-3 px-2" aria-label="IRPC staff home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-husk font-bold text-ink">IR</span>
          <span className="flex flex-col leading-tight">
            <span className="font-bold">IRPC</span>
            <span className="text-xs text-white/65">Staff workspace</span>
          </span>
        </Link>
        <Menu />
        <div className="mt-auto border-t border-white/10 pt-4">
          <Link href="/buyer" className="flex min-h-11 items-center rounded-lg px-3 text-sm text-white/75 hover:bg-white/10 hover:text-white">
            Open buyer portal
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-white/95 shadow-sm backdrop-blur">
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/staff" className="font-bold text-ink lg:hidden">IRPC staff</Link>
              <span className="hidden text-sm font-bold text-ink lg:inline">Operations console</span>
              <span className="hidden rounded-full bg-mist px-3 py-1 text-xs font-bold text-paddy-d sm:inline-flex">{isMock ? "DEMO · Sample data" : "IRPC"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/buyer" className="hidden min-h-10 items-center rounded-lg px-3 text-sm font-bold text-sub hover:bg-mist sm:inline-flex">
                Buyer portal
              </Link>
              <button
                type="button"
                aria-expanded={open}
                aria-controls="staff-mobile-navigation"
                onClick={() => setOpen((value) => !value)}
                className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-bold text-ink hover:bg-mist lg:hidden"
              >
                {open ? "Close menu" : "Menu"}
              </button>
            </div>
          </div>
        </header>

        {open && (
          <div id="staff-mobile-navigation" className="no-print border-b border-line bg-ink p-4 text-white lg:hidden">
            <Menu onPick={() => setOpen(false)} />
            <Link href="/buyer" onClick={() => setOpen(false)} className="mt-5 flex min-h-11 items-center border-t border-white/15 px-3 pt-2 text-sm text-white/75">
              Open buyer portal
            </Link>
          </div>
        )}

        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
