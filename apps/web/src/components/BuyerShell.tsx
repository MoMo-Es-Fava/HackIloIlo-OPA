"use client";

import { useStore } from "@/lib/store";
import { LanguageToggle, useLanguage } from "@/lib/language";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "./ui";
import { IconHome, IconBag, IconClipboard, IconLeaf, IconUser, IconSpark, IconWrench } from "./icons";

// The four main actions plus Home. Prices are on Home; Account is in the header.
const nav = [
  { href: "/buyer", label: "Home", exact: true, Icon: IconHome },
  { href: "/buyer/offers", label: "Buy rice", Icon: IconBag },
  { href: "/buyer/sell", label: "Sell palay", Icon: IconLeaf },
  { href: "/buyer/service", label: "Drying & milling", Icon: IconWrench },
  { href: "/buyer/orders", label: "My orders", Icon: IconClipboard },
];

export default function BuyerShell({ children }: { children: ReactNode }) {
  const { isMock } = useStore();
  const { t } = useLanguage();
  const labels: Record<string, string> = { Home: "Balay", "Buy rice": "Magbakal bugas", "Sell palay": "Magbaligya palay", "Drying & milling": "Pagpamala kag paggaling", "My orders": "Akon mga order" };
  const path = usePathname();
  const on = (n: (typeof nav)[number]) =>
    n.exact ? path === n.href : path.startsWith(n.href);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-black/10 bg-paddy-d/95 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_8px_24px_-16px_rgba(23,38,31,0.5)] backdrop-blur-md">
        <div className="mx-auto flex min-h-[72px] max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
          <Link href="/buyer" className="flex min-h-11 items-center gap-3 rounded-lg" aria-label="IRPC home">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-husk font-bold text-ink shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]">IR</span>
            <span className="flex flex-col leading-tight">
              <span className="font-bold tracking-wide">IRPC</span>
              <span className="text-sm text-white/75">Iloilo Rice Processing Complex</span>
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
                {t(n.label, labels[n.label])}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {isMock && (
              <span className="hidden items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-sm font-bold lg:inline-flex">
                <IconSpark className="h-3.5 w-3.5" />
                Demo · sample data
              </span>
            )}
            <Link
              href="/buyer/me"
              aria-current={path.startsWith("/buyer/me") ? "page" : undefined}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-white/25 px-3 text-sm font-bold hover:bg-white/10"
            >
              <IconUser className="h-[18px] w-[18px]" />
              Account
            </Link>
          </div>
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
              "relative flex min-h-16 flex-col items-center justify-center gap-1 border-t-2 px-1 text-center text-[13px] leading-tight transition-colors",
              on(n) ? "border-paddy-d bg-mist font-bold text-paddy-d" : "border-transparent text-sub hover:bg-mist",
            )}
          >
            <n.Icon className="h-5 w-5" />
            <span>{t(n.label, labels[n.label])}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
