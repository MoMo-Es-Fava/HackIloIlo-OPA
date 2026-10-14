"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "./ui";

const nav = [
  { href: "/buyer", label: "Home", exact: true },
  { href: "/buyer/offers", label: "Buy rice" },
  { href: "/buyer/orders", label: "My orders" },
  { href: "/buyer/prices", label: "Today's prices" },
  { href: "/buyer/me", label: "Account" },
];

export default function BuyerShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const on = (n: (typeof nav)[number]) =>
    n.exact ? path === n.href : path.startsWith(n.href) || (n.href === "/buyer/me" && path.startsWith("/buyer/service"));

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-white/10 bg-paddy-d text-white shadow-sm">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/buyer" className="flex min-h-11 items-center gap-3 rounded-lg" aria-label="IRPC home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-husk font-bold text-ink">IR</span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold tracking-wide">IRPC</span>
              <span className="text-xs text-white/75">Rice marketplace</span>
            </span>
          </Link>
          <nav className="hidden h-full items-center gap-1 md:flex" aria-label="Main navigation">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on(n) ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 text-sm font-bold transition-colors lg:px-4",
                  on(n) ? "bg-white text-paddy-d" : "text-white/90 hover:bg-white/10 hover:text-white",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="hidden rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-bold sm:inline-flex">
            DEMO · Sample data
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-12">
        {children}
      </main>

      <nav className="no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(23,38,31,0.06)] backdrop-blur md:hidden" aria-label="Main navigation">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on(n) ? "page" : undefined}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center border-t-2 px-1 text-center text-[11px] leading-tight transition-colors",
              on(n) ? "border-paddy-d bg-mist font-bold text-paddy-d" : "border-transparent text-sub hover:bg-mist",
            )}
          >
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
