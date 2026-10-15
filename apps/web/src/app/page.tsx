"use client";

import { useStore } from "@/lib/store";
import Link from "next/link";
import { IconArrowRight, IconBolt, IconLeaf, IconTrace, IconUser, IconWrench } from "@/components/icons";

const portals = [
  {
    href: "/buyer",
    icon: IconUser,
    eyebrow: "For farmers and buyers",
    title: "Sell palay, buy rice, book drying",
    description: "See today's prices, sell your palay to IRPC, order milled rice, or book drying and milling. Get text updates on every step.",
    action: "Start here",
    btn: "bg-husk text-ink hover:bg-[#f5d98f]",
  },
  {
    href: "/staff",
    icon: IconWrench,
    eyebrow: "For IRPC staff",
    title: "Run today's operations",
    description: "Approve orders, record weights, move batches through drying and milling, and update prices.",
    action: "Open staff workspace",
    btn: "bg-white text-paddy-d hover:bg-mist",
  },
];

const pillars = [
  { icon: IconTrace, label: "Traceable", detail: "From the farm to the buyer" },
  { icon: IconBolt, label: "Real-time", detail: "Queue, costs, and energy" },
  { icon: IconLeaf, label: "Local", detail: "Iloilo Rice Processing Complex, Pototan" },
];

export default function Landing() {
  const { isMock } = useStore();
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-paddy-d via-[#1b4230] to-ink">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full border border-white/10" />
      <div aria-hidden className="pointer-events-none absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-husk/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <header className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-husk font-bold text-ink shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]">IR</span>
          <span className="flex flex-col leading-tight text-white">
            <span className="font-bold tracking-wide">IRPC</span>
            <span className="text-sm text-white/75">Iloilo Rice Processing Complex</span>
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-center py-12 sm:py-20">
          <div className="max-w-3xl">
            <h1 className="text-[2.4rem] font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
              Sell palay, buy rice, and book drying at{" "}
              <span className="relative inline-block">
                <span className="relative z-10">IRPC.</span>
                <span aria-hidden className="absolute -bottom-1 left-0 h-[7px] w-full rounded-full bg-husk/70" />
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
              See today&apos;s prices, book a slot instead of waiting in line, and follow your palay from drying to the buyer.
            </p>

            <section className="mt-9 grid gap-4 sm:grid-cols-2" aria-label="Choose where to go">
              {portals.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="group relative flex flex-col justify-between gap-6 overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] p-6 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.11] sm:p-7"
                >
                  <div className="relative flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-husk ring-1 ring-inset ring-white/15">
                        <portal.icon className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-white/80">{portal.eyebrow}</p>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-white">{portal.title}</h2>
                    <p className="max-w-md leading-relaxed text-white/80">{portal.description}</p>
                  </div>
                  <span className={`inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl px-5 font-bold shadow-[0_10px_28px_-12px_rgba(0,0,0,0.6)] transition-all group-hover:gap-3 ${portal.btn}`}>
                    {portal.action}
                    <IconArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-husk/15 text-husk ring-1 ring-inset ring-husk/20">
                  <p.icon className="h-5 w-5" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="font-bold text-white">{p.label}</span>
                  <span className="text-sm text-white/70">{p.detail}</span>
                </span>
              </div>
            ))}
          </div>

          {isMock && (
            <p className="flex items-start gap-2 border-t border-white/10 pt-5 text-sm text-white/70">
              <span aria-hidden className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-white/85">
                i
              </span>
              Demo: sample records are shared between the two sides and reset when you reload. No sign-in or real transactions.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
