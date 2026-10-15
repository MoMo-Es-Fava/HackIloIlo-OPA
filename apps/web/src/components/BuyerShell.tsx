"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "./ui";
import { IconHome, IconBag, IconClipboard, IconChart, IconUser, IconSpark } from "./icons";

const nav = [
  { href: "/buyer", label: "Home", exact: true, Icon: IconHome },
  { href: "/buyer/offers", label: "Buy rice", Icon: IconBag },
  { href: "/buyer/orders", label: "My orders", Icon: IconClipboard },
  { href: "/buyer/prices", label: "Prices", Icon: IconChart },
  { href: "/buyer/me", label: "Account", Icon: IconUser },
];

export default function BuyerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const on = (n: (typeof nav)[number]) =>
    n.exact ? path === n.href : path.startsWith(n.href) || (n.href === "/buyer/me" && path.startsWith("/buyer/service"));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-black/10 bg-paddy-d/95 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_24px_-16px_rgba(23,38,31,0.5)] backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/buyer" className="flex min-h-11 items-center gap-3 rounded-lg" aria-label="IRPC home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-husk font-bold text-ink shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]">IR</span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold tracking-wide">IRPC</span>
              <span className="text-xs text-white/70">Rice marketplace</span>
            </span>
          </Link>
          <nav className="hidden h-full items-center gap-1 md:flex" aria-label="Main navigation">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on(n) ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-colors lg:px-4",
                  on(n) ? "bg-white text-paddy-d" : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                <n.Icon className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold sm:inline-flex">
            <IconSpark className="h-3.5 w-3.5" />
            DEMO · Sample data
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-12">{children}</main>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(23,38,31,0.06)] backdrop-blur md:hidden"
        aria-label="Main navigation"
      >
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on(n) ? "page" : undefined}
            className={cn(
              "relative flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 px-1 text-center text-[11px] leading-tight transition-colors",
              on(n) ? "border-paddy-d bg-mist font-bold text-paddy-d" : "border-transparent text-sub hover:bg-mist",
            )}
          >
            <n.Icon className="h-5 w-5" />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
