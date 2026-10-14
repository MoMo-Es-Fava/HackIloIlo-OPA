"use client";

import { ACTIVE_STATUSES, OrderStatus } from "@irpc/types";
import { orderAmount, orderTypeLabel, statusLabel } from "@/lib/orders";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { Badge, Button, Empty, PageHeader, orderTone } from "@/components/ui";

const tabs = ["All", "Active", "Completed", "Rejected", "Cancelled"] as const;

export default function Orders() {
  const { orders, orderDetails, profile } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const mine = orders.filter((o) => orderDetails[o.id]?.ownerId === profile.id);
  const list = mine.filter((o) => tab === "All" || (tab === "Active" ? ACTIVE_STATUSES.includes(o.status) : o.status === ({ Completed: OrderStatus.COMPLETED, Rejected: OrderStatus.REJECTED, Cancelled: OrderStatus.CANCELLED } as const)[tab]));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Orders" sub="Track rice purchases, palay sales, and services." actions={<Link href="/buyer/trace" className="min-h-11 py-2 font-bold text-sky-d underline">Trace a batch</Link>} />
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? "primary" : "ghost"} onClick={() => setTab(t)}>{t}</Button>)}
      </div>
      {list.length === 0 && <Empty>No orders here yet.</Empty>}
      <div className="flex flex-col gap-3">
        {list.map((o) => (
          <Link key={o.id} href={`/buyer/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div><p className="font-bold">{o.ref}: {kgf(o.requestedKg)}</p><p className="text-sm text-sub">{orderTypeLabel[o.type]} · {peso(orderAmount(o))} {o.finalAmount === null ? "estimated" : "total"} · {dateLabel(o.createdAt)}</p></div>
            <Badge tone={orderTone(o.status)}>{statusLabel[o.status]}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
