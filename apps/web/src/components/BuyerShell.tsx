"use client";

import { useStore } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "./ui";
import { IconHome, IconBag, IconClipboard, IconUser, IconSpark, IconLeaf, IconWrench } from "./icons";
import AuthControls from "./AuthControls";
import BrandLogo from "./BrandLogo";

const nav = [
  { href: "/buyer", label: "Home", short: "Home", exact: true, Icon: IconHome },
  { href: "/buyer/sell", label: "Sell palay", short: "Sell", Icon: IconLeaf },
  { href: "/buyer/offers", label: "Buy rice", short: "Buy", Icon: IconBag },
  { href: "/buyer/service", label: "Drying and milling", short: "Drying", Icon: IconWrench },
  { href: "/buyer/orders", label: "My orders", short: "Orders", Icon: IconClipboard },
  { href: "/buyer/me", label: "Account", short: "Account", Icon: IconUser },
];

export default function BuyerShell({ children }: { children: ReactNode }) {
  const { isMock } = useStore();
  const path = usePathname();
  const on = (n: (typeof nav)[number]) =>
    n.exact ? path === n.href : path === n.href || path.startsWith(`${n.href}/`);

  return (
    <div className="buyer-workspace flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-black/10 bg-paddy-d/95 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_24px_-16px_rgba(23,38,31,0.5)] backdrop-blur-md">
        <div className="mx-auto grid min-h-[84px] w-full max-w-[1600px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 sm:px-6 lg:px-8 2xl:px-12 max-lg:grid-cols-[minmax(0,1fr)_auto]">
          <Link href="/buyer" className="buyer-shell-brand brand-logo-link flex min-h-12 min-w-0 items-center gap-3 justify-self-start rounded-lg" aria-label="ALAGARAB home">
            <BrandLogo size={48} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="text-lg font-bold tracking-wide">ALAGARAB</span>
              <span className="buyer-brand-subtitle text-[13px] text-white/70">Palay, rice and milling</span>
            </span>
          </Link>
          <nav className="hidden h-full items-center gap-0 lg:flex xl:gap-1" aria-label="Main navigation">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={on(n) ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 items-center gap-1 rounded-lg px-2 text-[13px] font-bold transition-colors xl:gap-2 xl:px-4 xl:text-[15px]",
                  on(n) ? "bg-white text-paddy-d" : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                <n.Icon className="h-[18px] w-[18px]" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-self-end gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold xl:inline-flex">
              <IconSpark className="h-3.5 w-3.5" />
              {isMock ? "DEMO · Sample data" : "ALAGARAB"}
            </span>
            {!isMock && <AuthControls />}
          </div>
        </div>
      </header>

      <main className="buyer-content mx-auto w-full max-w-[1600px] flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12 2xl:px-12">{children}</main>

      <nav
      className="buyer-mobile-nav no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 gap-2 border-t border-line bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(23,38,31,0.06)] backdrop-blur lg:hidden"
        aria-label="Main navigation"
      >
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on(n) ? "page" : undefined}
            className={cn(
              "relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 border-t-2 px-0.5 text-center text-[11px] leading-tight transition-colors",
              on(n) ? "border-paddy-d bg-mist font-bold text-paddy-d" : "border-transparent text-sub hover:bg-mist",
            )}
          >
            <n.Icon className="h-5 w-5" />
            <span>{n.short}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
