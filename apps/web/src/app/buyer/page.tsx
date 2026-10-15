"use client";

import { ACTIVE_STATUSES, OrderStatus, OrderType, PriceItem, type OrderDto } from "@irpc/types";
import { currentPrice, orderAmount, orderTypeLabel, statusLabel } from "@/lib/orders";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { Badge, Card, PageHeader, cn, orderTone } from "@/components/ui";
import { IconAlert, IconArrowRight, IconBag, IconChart, IconClipboard, IconLeaf, IconWrench } from "@/components/icons";

const nextStep: Partial<Record<OrderStatus, string>> = {
  PENDING: "IRPC will review your request and confirm availability.",
  ACCEPTED: "IRPC has confirmed your order and locked its price.",
  SCHEDULED: "Your service is scheduled. Check the confirmed date.",
  READY_FOR_PICKUP: "Your order is ready for pickup.",
  WEIGHED: "IRPC has recorded your weight. Open the order for details.",
};
const needsAction = (order: OrderDto) =>
  order.type === OrderType.SELL_PALAY && order.status === OrderStatus.WEIGHED && !order.weightConfirmedAt;
const hint = (order: OrderDto) =>
  needsAction(order)
    ? "Please confirm your weight so IRPC can pay you."
    : nextStep[order.status] ?? "Open this order to see the latest update.";

const actions = [
  { href: "/buyer/offers", title: "Buy rice", sub: "Order milled rice by the kilo.", Icon: IconBag, tone: "border-paddy-d bg-paddy-d text-white hover:bg-paddy", subTone: "text-white/85" },
  { href: "/buyer/sell", title: "Sell palay", sub: "Fresh or dry palay, at today's price.", Icon: IconLeaf, tone: "border-husk bg-husk text-ink hover:bg-[#f5d98f]", subTone: "text-ink/80" },
  { href: "/buyer/service", title: "Drying & milling", sub: "We dry or mill your palay for a fee.", Icon: IconWrench, tone: "border-sky-d bg-sky-d text-white hover:opacity-90", subTone: "text-white/85" },
  { href: "/buyer/orders", title: "My orders", sub: "Track every request in one place.", Icon: IconClipboard, tone: "border-paddy-d bg-white text-paddy-d hover:bg-mist", subTone: "text-sub" },
];

export default function BuyerHome() {
  const { profile, orders, prices } = useStore();
  // Orders that need the user to do something come first.
  const active = orders
    .filter((order) => ACTIVE_STATUSES.includes(order.status))
    .sort((a, b) => Number(needsAction(b)) - Number(needsAction(a)) || b.createdAt.localeCompare(a.createdAt));
  const fresh = currentPrice(prices, PriceItem.PALAY_FRESH)?.pricePerKg ?? null;
  const dry = currentPrice(prices, PriceItem.PALAY_DRY)?.pricePerKg ?? null;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome{profile.name ? `, ${profile.name}` : ""}</h1>

      {active.length > 0 && (
        <section className="flex flex-col gap-4">
          <PageHeader level={2} title="Your active orders" sub="See the current status and what happens next." />
          <div className="grid gap-3 lg:grid-cols-2">
            {active.slice(0, 2).map((order) => {
              const action = needsAction(order);
              return (
                <Link
                  key={order.id}
                  href={`/buyer/orders/${order.id}`}
                  className={cn(
                    "group flex flex-col justify-between gap-5 rounded-2xl border bg-white p-5 shadow-card transition-all hover:shadow-raised focus-visible:outline-offset-4",
                    action ? "border-2 border-[#c79a2e] bg-husk/10" : "border-line/80 hover:border-paddy/50",
                  )}
                >
                  {action && (
                    <p className="inline-flex items-center gap-2 font-bold text-[#7a5a10]">
                      <IconAlert className="h-5 w-5" /> Action needed
                    </p>
                  )}
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
                      <p className={cn("mt-1 max-w-md text-sm", action ? "font-bold text-ink" : "text-sub")}>{hint(order)}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 font-bold text-paddy-d">
                      {action ? "Confirm" : "Details"}
                      <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href="/buyer/orders" className="inline-flex min-h-11 items-center gap-1.5 self-start font-bold text-paddy-d hover:underline">
            {active.length > 2 ? `See all orders (${active.length - 2} more)` : "See all orders"}
            <IconArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-4" aria-labelledby="actions-title">
        <h2 id="actions-title" className="text-xl font-bold tracking-tight">What would you like to do?</h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={cn("flex min-h-32 flex-col justify-center gap-2 rounded-2xl border-2 p-5 shadow-card transition-colors", a.tone)}
            >
              <a.Icon className="h-7 w-7" />
              <span className="text-xl font-bold">{a.title}</span>
              <span className={cn("text-sm", a.subTone)}>{a.sub}</span>
            </Link>
          ))}
        </div>
      </section>

      {active.length === 0 && (
        <Card className="border-dashed bg-white/60">
          <p className="font-bold">No active orders yet</p>
          <p className="text-sub">Pick one of the buttons above to get started. Your order and its progress will show up here.</p>
        </Card>
      )}

      <Link
        href="/buyer/prices"
        className="group flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line/80 bg-white px-5 py-3 shadow-card hover:border-paddy/50"
      >
        <span className="flex items-center gap-3">
          <IconChart className="h-6 w-6 text-paddy-d" />
          <span>
            <span className="block font-bold">Today&apos;s palay prices</span>
            <span className="tnum text-sm text-sub">Fresh {peso(fresh, 0)}/kg · Dry {peso(dry, 0)}/kg</span>
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-bold text-paddy-d">
          See all <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </div>
  );
}
