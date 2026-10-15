"use client";

import { useStore } from "@/lib/store";
import Link from "next/link";
import { Card } from "@/components/ui";

const portals = [
  {
    href: "/buyer",
    eyebrow: "For rice buyers",
    title: "Buy rice and track orders",
    description: "Browse IRPC rice, compare available stock and prices, and follow your order from reservation to delivery.",
    action: "Open buyer portal",
    tone: "border-paddy-d bg-paddy-d text-white",
    detail: "Offers · orders · prices · batch traceability",
  },
  {
    href: "/staff",
    eyebrow: "For IRPC staff",
    title: "Run today's operations",
    description: "Coordinate arrivals, record weights, move batches through processing, and manage sales and prices.",
    action: "Open staff workspace",
    tone: "border-line bg-white text-ink",
    detail: "Queue · intake · processing · sales",
  },
];

export default function Landing() {
  const { isMock } = useStore();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-4 py-12 sm:px-6 lg:py-16">
      <div className="max-w-3xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-bold text-paddy-d">
          <span className="h-2 w-2 rounded-full bg-paddy" aria-hidden />
          Iloilo rice processing complex
        </div>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Good rice starts with a
          <span className="text-paddy-d"> better connection.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-sub">
          One place to find IRPC rice, follow every batch, and keep plant operations moving.
          Choose the workspace that fits what you need to do.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Choose a workspace">
        {portals.map((portal) => (
          <Card key={portal.href} className={`group justify-between gap-7 border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:p-8 ${portal.tone}`}>
            <div className="flex flex-col gap-3">
              <p className={`text-sm font-bold uppercase tracking-[0.12em] ${portal.href === "/buyer" ? "text-white/70" : "text-paddy-d"}`}>
                {portal.eyebrow}
              </p>
              <h2 className="text-2xl font-bold sm:text-3xl">{portal.title}</h2>
              <p className={portal.href === "/buyer" ? "max-w-md text-white/80" : "max-w-md text-sub"}>
                {portal.description}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <span className={`text-sm ${portal.href === "/buyer" ? "text-white/70" : "text-sub"}`}>{portal.detail}</span>
              <Link
                href={portal.href}
                className={`inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-xl px-5 font-bold transition-colors ${
                  portal.href === "/buyer"
                    ? "bg-husk text-ink hover:bg-[#f5d98f]"
                    : "bg-paddy-d text-white hover:bg-paddy"
                }`}
              >
                {portal.action}<span aria-hidden>→</span>
              </Link>
            </div>
          </Card>
        ))}
      </section>

      <p className="flex items-start gap-2 text-sm text-sub">
        <span aria-hidden>ⓘ</span>
        {isMock ? "Demo workspace: sample records are shared between portals and reset when you reload the page. No sign-in or real transactions." : "Welcome to the IRPC rice marketplace."}
      </p>
    </main>
  );
}
