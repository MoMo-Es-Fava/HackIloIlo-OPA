"use client";

import { useStore } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "./ui";
import { IconHome, IconFlame, IconReceipt, IconChart, IconBox, IconArrowRight, IconLeaf, IconClipboard } from "./icons";
import AuthControls from "./AuthControls";

// Only pages that work on the real API. The older demo pages (booking slots, weigh-in slips,
// costing, energy, batch search, users, audit) stay in the code but are off the menu for now.
const groups = [
  { title: "Workspace", items: [{ href: "/staff", label: "Today", Icon: IconHome }] },
  {
    title: "Operations",
    items: [
      { href: "/staff/palay", label: "Palay procurement", Icon: IconLeaf },
      { href: "/staff/services", label: "Drying and milling", Icon: IconFlame },
      { href: "/staff/processing", label: "Batch records", Icon: IconClipboard },
      { href: "/staff/bad-inputs", label: "Bad-input batches", Icon: IconClipboard },
      { href: "/staff/rice-sales", label: "Rice sales", Icon: IconBox },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/staff/report", label: "Report", Icon: IconChart },
      { href: "/staff/pricing", label: "Pricing and stock", Icon: IconReceipt },
      { href: "/staff/logs", label: "IRPC logs", Icon: IconClipboard },
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
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{group.title}</p>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onPick}
              aria-current={on(item.href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
                on(item.href)
                  ? "bg-husk font-bold text-ink shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)]"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
            >
              <item.Icon className="h-[18px] w-[18px] shrink-0" />
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
      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-8 overflow-y-auto border-r border-black/20 bg-ink px-4 py-6 text-white lg:flex">
        <Link href="/staff" className="flex min-h-11 items-center gap-3 px-2" aria-label="IRPC staff home">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-husk font-bold text-ink shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]">IR</span>
          <span className="flex flex-col leading-tight">
            <span className="font-bold">IRPC</span>
            <span className="text-xs text-white/60">Staff workspace</span>
          </span>
        </Link>
        <Menu />
        <div className="mt-auto border-t border-white/10 pt-4">
          <Link
            href="/buyer"
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Open buyer portal
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-white/90 shadow-sm backdrop-blur-md">
          <div className="flex min-h-[68px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/staff" className="font-bold text-ink lg:hidden">IRPC staff</Link>
              <span className="hidden text-sm font-bold text-ink lg:inline">Operations console</span>
              <span className="hidden rounded-full bg-mist px-3 py-1 text-sm font-bold text-paddy-d sm:inline-flex">{isMock ? "DEMO · Sample data" : "IRPC"}</span>
            </div>
            <div className="flex items-center gap-2">
              {!isMock && <AuthControls tone="light" />}
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
