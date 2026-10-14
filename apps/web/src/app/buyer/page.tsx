"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Badge, Card, PageHeader, Stat, orderTone } from "@/components/ui";

const nextStep: Record<string, string> = {
  Reserved: "IRPC will confirm the order and prepare payment details.",
  Paid: "Payment is recorded. IRPC is preparing your rice.",
  Ready: "Your rice is ready. Check the order for pickup or delivery details.",
};

export default function BuyerHome() {
  const { profile, orders, offers, prices } = useStore();
  const mine = orders.filter((order) => order.buyerId === profile.id);
  const active = mine.filter((order) => order.status !== "Delivered" && order.status !== "Cancelled");
  const open = offers.filter((offer) => offer.kgAvailable > 0);
  const featured = open.slice(0, 2);

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl bg-paddy-d p-6 text-white shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.06]" aria-hidden />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="mb-2 text-sm font-bold text-white/70">BUYER WORKSPACE</p>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Welcome, {profile.name}</h1>
            <p className="mt-3 text-white/80">Find quality rice, keep an eye on your orders, and see what is happening at IRPC.</p>
          </div>
          <Link href="/buyer/offers" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-husk px-5 font-bold text-ink transition-colors hover:bg-[#f5d98f] sm:w-auto">
            Browse rice <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Account summary">
        <Link href="/buyer/orders" className="rounded-2xl outline-offset-4">
          <Stat label="Active orders" value={String(active.length)} hint="Orders still in progress" />
        </Link>
        <Link href="/buyer/offers" className="rounded-2xl outline-offset-4">
          <Stat label="Rice offers" value={String(open.length)} hint="Available to reserve" />
        </Link>
        <Link href="/buyer/prices" className="rounded-2xl outline-offset-4">
          <Stat label="Dry palay today" value={`${peso(prices.dry, 0)}/kg`} hint={`Fresh ${peso(prices.fresh, 0)}/kg · View all prices`} />
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <PageHeader
          level={2}
          title="Your active orders"
          sub="See the current status and what happens next."
          actions={<Link href="/buyer/orders" className="inline-flex min-h-11 items-center font-bold text-paddy-d underline">See all orders</Link>}
        />
        {active.length === 0 ? (
          <Card className="items-start border-dashed bg-white">
            <p className="font-bold">No active orders yet</p>
            <p className="text-sub">Your next rice reservation will show up here, along with its progress.</p>
            <Link href="/buyer/offers" className="inline-flex min-h-11 items-center font-bold text-paddy-d underline">Explore rice offers</Link>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {active.slice(0, 2).map((order) => (
              <Link
                key={order.id}
                href={`/buyer/orders/${order.id}`}
                className="group flex min-h-48 flex-col justify-between gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_2px_8px_rgba(23,38,31,0.035)] transition-all hover:border-paddy hover:shadow-md focus-visible:outline-offset-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-sub">{order.id}</p>
                    <p className="mt-1 text-lg font-bold">{kgf(order.kg)} of rice</p>
                    <p className="text-sm text-sub">Placed {order.createdAt}</p>
                  </div>
                  <Badge tone={orderTone(order.status)}>{order.status}</Badge>
                </div>
                <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
                  <div>
                    <p className="text-sm text-sub">Order total</p>
                    <p className="font-bold">{peso(order.kg * order.pricePerKg)}</p>
                    <p className="mt-1 max-w-md text-sm text-sub">{nextStep[order.status] ?? "Open this order to see the latest update."}</p>
                  </div>
                  <span className="shrink-0 font-bold text-paddy-d group-hover:underline">Details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <PageHeader level={2} title="A good place to start" sub="Your most-used actions, all in one place." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/buyer/offers" className="group rounded-2xl border border-paddy-d bg-white p-5 transition-colors hover:bg-mist">
            <span className="text-sm font-bold text-paddy-d">BUY RICE</span>
            <h2 className="mt-2 text-lg font-bold">Browse available rice</h2>
            <p className="mt-1 text-sm text-sub">Compare price, grade, stock, and batch origin.</p>
            <span className="mt-4 inline-flex min-h-8 items-center font-bold text-paddy-d">View offers →</span>
          </Link>
          <Link href="/buyer/service" className="group rounded-2xl border border-line bg-white p-5 transition-colors hover:border-paddy">
            <span className="text-sm font-bold text-sky-d">BOOK A SERVICE</span>
            <h2 className="mt-2 text-lg font-bold">Drying, milling, or storage</h2>
            <p className="mt-1 text-sm text-sub">Send a request to the IRPC team for review.</p>
            <span className="mt-4 inline-flex min-h-8 items-center font-bold text-paddy-d">Request a service →</span>
          </Link>
          <Link href="/buyer/prices" className="group rounded-2xl border border-line bg-white p-5 transition-colors hover:border-paddy sm:col-span-2 lg:col-span-1">
            <span className="text-sm font-bold text-sky-d">CHECK PRICES</span>
            <h2 className="mt-2 text-lg font-bold">Today's palay prices</h2>
            <p className="mt-1 text-sm text-sub">Fresh {peso(prices.fresh, 0)}/kg · Dry {peso(prices.dry, 0)}/kg</p>
            <span className="mt-4 inline-flex min-h-8 items-center font-bold text-paddy-d">See price history →</span>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <PageHeader
          level={2}
          title="Recently available"
          sub="Every offer links back to its source batch for traceability."
          actions={<Link href="/buyer/offers" className="inline-flex min-h-11 items-center font-bold text-paddy-d underline">All offers</Link>}
        />
        {featured.length === 0 ? (
          <Card><p className="text-sub">No rice offers are available right now. Please check again later.</p></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((offer) => (
              <Link key={offer.id} href={`/buyer/offers/${offer.id}`} className="group rounded-2xl border border-line bg-white p-5 transition-all hover:border-paddy hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{offer.grade}</p>
                    <p className="mt-1 text-2xl font-bold text-paddy-d">{peso(offer.pricePerKg)}<span className="text-sm font-normal text-sub"> / kg</span></p>
                  </div>
                  <Badge tone="info">{offer.id}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                  <span>{kgf(offer.kgAvailable)} available</span>
                  <span className="font-bold text-paddy-d group-hover:underline">View rice →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
