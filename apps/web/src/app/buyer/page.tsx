"use client";

import { ACTIVE_STATUSES, OrderStatus, OrderType, PriceItem, type OrderDto } from "@irpc/types";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { currentPrice, orderAmount, orderTypeLabel, statusLabel } from "@/lib/orders";
import { Badge, Card, PageHeader, Stat, orderTone } from "@/components/ui";
import { IconClipboard, IconBag, IconChart, IconArrowRight, IconWrench, IconTrace, IconLeaf } from "@/components/icons";

const nextStep: Partial<Record<OrderStatus, string>> = {
  PENDING: "IRPC will review your request and confirm availability.",
  ACCEPTED: "IRPC has confirmed your order and locked its price.",
  SCHEDULED: "Your service is scheduled. Check the confirmed date.",
  READY_FOR_PICKUP: "Your order is ready for pickup.",
  WEIGHED: "IRPC has recorded your weight. Open the order for details.",
};
const hint = (order: OrderDto) =>
  order.type === OrderType.SELL_PALAY && order.status === OrderStatus.WEIGHED && !order.weightConfirmedAt
    ? "Please confirm your weight so IRPC can pay you."
    : nextStep[order.status] ?? "Open this order to see the latest update.";

export default function BuyerHome() {
  const { profile, orders, offers, prices } = useStore();
  const active = orders
    .filter((order) => ACTIVE_STATUSES.includes(order.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const fresh = currentPrice(prices, PriceItem.PALAY_FRESH)?.pricePerKg ?? null;
  const dry = currentPrice(prices, PriceItem.PALAY_DRY)?.pricePerKg ?? null;
  const open = offers.filter((offer) => offer.kgAvailable > 0);
  const featured = open.slice(0, 2);

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-paddy-d via-[#22593d] to-[#163527] p-6 text-white shadow-raised sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-4 top-8 h-44 w-44 rounded-full bg-husk/10 blur-2xl"
        />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.14em] text-husk">
              Buyer workspace
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Welcome, {profile.name}</h1>
            <p className="mt-3 text-white/80">Find quality rice, keep an eye on your orders, and see what is happening at IRPC.</p>
          </div>
          <Link
            href="/buyer/offers"
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-husk px-5 font-bold text-ink shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)] transition-all hover:bg-[#f5d98f] hover:gap-3 sm:w-auto"
          >
            Browse rice
            <IconArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Account summary">
        <Link href="/buyer/orders" className="rounded-2xl outline-offset-4">
          <Stat label="Active orders" value={String(active.length)} hint="Orders still in progress" icon={<IconClipboard className="h-4 w-4" />} />
        </Link>
        <Link href="/buyer/offers" className="rounded-2xl outline-offset-4">
          <Stat label="Rice offers" value={String(open.length)} hint="Available to reserve" icon={<IconBag className="h-4 w-4" />} />
        </Link>
        <Link href="/buyer/prices" className="rounded-2xl outline-offset-4">
          <Stat label="Dry palay today" value={`${peso(dry, 0)}/kg`} hint={`Fresh ${peso(fresh, 0)}/kg · View all prices`} icon={<IconChart className="h-4 w-4" />} />
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <PageHeader
          level={2}
          title="Your active orders"
          sub="See the current status and what happens next."
          actions={
            <Link href="/buyer/orders" className="group inline-flex min-h-11 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
              See all orders <IconArrowRight className="h-4 w-4 transition-all group-hover:translate-x-0.5" />
            </Link>
          }
        />
        {active.length === 0 ? (
          <Card className="border-dashed bg-white/60">
            <p className="font-bold">No active orders yet</p>
            <p className="text-sub">Your next rice reservation will show up here, along with its progress.</p>
            <Link href="/buyer/offers" className="inline-flex min-h-11 items-center font-bold text-paddy-d hover:underline">
              Explore rice offers
            </Link>
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
                    <p className="text-sm font-bold text-sub">{order.ref}</p>
                    <p className="mt-1 text-lg font-bold">{orderTypeLabel[order.type]} · {kgf(order.requestedKg)}</p>
                    <p className="text-sm text-sub">Placed {dateLabel(order.createdAt)}</p>
                  </div>
                  <Badge tone={orderTone(order.status)}>{statusLabel[order.status]}</Badge>
                </div>
                <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
                  <div>
                    <p className="text-sm text-sub">{order.finalAmount === null ? "Estimated amount" : "Final amount"}</p>
                    <p className="tnum font-bold">{peso(orderAmount(order))}</p>
                    <p className="mt-1 max-w-md text-sm text-sub">{hint(order)}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 font-bold text-paddy-d">
                    Details <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <PageHeader level={2} title="A good place to start" sub="Your most-used actions, all in one place." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/buyer/offers", Icon: IconBag, kicker: "Buy rice", title: "Browse available rice", desc: "Compare price, grade, stock, and batch origin.", cta: "View offers", accent: true },
            { href: "/buyer/sell", Icon: IconLeaf, kicker: "Sell palay", title: "Sell your palay", desc: `Fresh ${peso(fresh, 0)}/kg · Dry ${peso(dry, 0)}/kg buying price.`, cta: "Sell palay" },
            { href: "/buyer/service", Icon: IconWrench, kicker: "Book a service", title: "Drying or milling", desc: "Send a request to the IRPC team for review.", cta: "Request a service" },
            { href: "/buyer/prices", Icon: IconChart, kicker: "Check prices", title: "Today's palay prices", desc: `Fresh ${peso(fresh, 0)}/kg · Dry ${peso(dry, 0)}/kg`, cta: "See price history" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`group flex flex-col rounded-2xl border bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised ${a.accent ? "border-paddy-d/40" : "border-line/80 hover:border-paddy/40"}`}
            >
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${a.accent ? "bg-paddy-d/8 text-paddy-d" : "bg-mist text-paddy-d"}`}>
                <a.Icon className="h-[22px] w-[22px]" />
              </span>
              <h2 className="mt-3 text-lg font-bold tracking-tight">{a.title}</h2>
              <p className="mt-1 text-sm text-sub">{a.desc}</p>
              <span className="mt-4 inline-flex min-h-8 items-center gap-1.5 font-bold text-paddy-d">
                {a.cta}
                <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <PageHeader
          level={2}
          title="Recently available"
          sub="Every offer links back to its source batch for traceability."
          actions={
            <Link href="/buyer/offers" className="group inline-flex min-h-11 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
              All offers <IconArrowRight className="h-4 w-4 transition-all group-hover:translate-x-0.5" />
            </Link>
          }
        />
        {featured.length === 0 ? (
          <Card>
            <p className="flex items-center gap-2 text-sub"><IconTrace className="h-5 w-5" /> No rice offers are available right now. Please check again later.</p>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {featured.map((offer) => (
              <Link key={offer.id} href={`/buyer/offers/${offer.id}`} className="group rounded-2xl border border-line/80 bg-white p-5 shadow-card transition-all hover:border-paddy/50 hover:shadow-raised">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{offer.grade}</p>
                    <p className="tnum mt-1 text-2xl font-bold tracking-tight text-paddy-d">{peso(offer.pricePerKg)}<span className="text-sm font-normal text-sub"> / kg</span></p>
                  </div>
                  <Badge tone="info">{offer.id}</Badge>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                  <span className="tnum">{kgf(offer.kgAvailable)} available</span>
                  <span className="inline-flex items-center gap-1 font-bold text-paddy-d">
                    View rice <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
