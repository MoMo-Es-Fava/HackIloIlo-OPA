"use client";

import { ACTIVE_STATUSES, OrderStatus, OrderType, type OrderDto } from "@irpc/types";
import { orderAmount, orderTypeLabel, statusLabel } from "@/lib/orders";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { Badge, Card, PageHeader, orderTone } from "@/components/ui";

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

const actions = [
  { href: "/buyer/offers", title: "Buy rice", sub: "Order milled rice by the kilo.", tone: "border-paddy-d bg-paddy-d text-white hover:bg-paddy", subTone: "text-white/80" },
  { href: "/buyer/sell", title: "Sell palay", sub: "Fresh or dry palay, with today's prices.", tone: "border-husk bg-husk text-ink hover:bg-[#f5d98f]", subTone: "text-ink/75" },
  { href: "/buyer/service", title: "Drying / Milling", sub: "We dry or mill your palay for a fee.", tone: "border-sky-d bg-sky-d text-white hover:opacity-90", subTone: "text-white/80" },
  { href: "/buyer/orders", title: "My orders", sub: "Track every request in one place.", tone: "border-paddy-d bg-white text-paddy-d hover:bg-mist", subTone: "text-sub" },
];

export default function BuyerHome() {
  const { profile, orders } = useStore();
  const active = orders
    .filter((order) => ACTIVE_STATUSES.includes(order.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Welcome{profile.name ? `, ${profile.name}` : ""}</h1>

      <section className="flex flex-col gap-4">
        <PageHeader level={2} title="Your active orders" sub="See the current status and what happens next." />
        {active.length === 0 ? (
          <Card className="items-start border-dashed bg-white">
            <p className="font-bold">No active orders yet</p>
            <p className="text-sub">Pick one of the buttons below to get started. Your order and its progress will show up here.</p>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {active.slice(0, 2).map((order) => (
              <Link
                key={order.id}
                href={`/buyer/orders/${order.id}`}
                className="group flex flex-col justify-between gap-5 rounded-2xl border border-line bg-white p-5 shadow-[0_2px_8px_rgba(23,38,31,0.035)] transition-all hover:border-paddy hover:shadow-md focus-visible:outline-offset-4"
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
                    <p className="font-bold">{peso(orderAmount(order))}</p>
                    <p className="mt-1 max-w-md text-sm text-sub">{hint(order)}</p>
                  </div>
                  <span className="shrink-0 font-bold text-paddy-d group-hover:underline">Details →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {active.length > 0 && (
          <Link href="/buyer/orders" className="inline-flex min-h-11 items-center font-bold text-paddy-d underline">
            {active.length > 2 ? `See all orders (${active.length} active)` : "See all orders"}
          </Link>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2" aria-label="What would you like to do?">
        {actions.map((a) => (
          <Link key={a.href} href={a.href}
            className={`flex min-h-32 flex-col justify-center gap-1 rounded-2xl border-2 p-5 transition-colors ${a.tone}`}>
            <span className="text-xl font-bold">{a.title}</span>
            <span className={`text-sm ${a.subTone}`}>{a.sub}</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
