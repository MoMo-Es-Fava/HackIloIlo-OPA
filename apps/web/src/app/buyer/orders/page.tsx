"use client";

import { ACTIVE_STATUSES, OrderStatus } from "@irpc/types";
import { orderAmount, orderTypeLabel, statusLabel } from "@/lib/orders";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { Badge, Empty, PageHeader, orderTone, cn } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";

const tabs = ["All", "Active", "Completed", "Rejected", "Cancelled"] as const;

export default function Orders() {
  const { orders } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const mine = orders;
  const list = mine.filter((o) => tab === "All" || (tab === "Active" ? ACTIVE_STATUSES.includes(o.status) : o.status === ({ Completed: OrderStatus.COMPLETED, Rejected: OrderStatus.REJECTED, Cancelled: OrderStatus.CANCELLED } as const)[tab]));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        sub="Track rice purchases, palay sales, and services."
        actions={
          <Link href="/buyer/trace" className="group inline-flex min-h-11 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
            Trace a batch <IconChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-line/80 bg-white p-1.5 shadow-card sm:w-fit" role="tablist" aria-label="Filter orders by status">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-4 text-sm font-bold transition-colors sm:flex-none",
              tab === t ? "bg-paddy-d text-white shadow-sm" : "text-sub hover:bg-mist hover:text-ink",
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {list.length === 0 && (
        <Empty>
          {tab === "All" ? "No orders yet. Start by browsing available rice or submitting a palay request." : (
            <>No {tab.toLowerCase()} orders. <button type="button" onClick={() => setTab("All")} className="font-bold text-paddy-d underline underline-offset-2">View all orders</button></>
          )}
        </Empty>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((o) => (
          <Link
            key={o.id}
            href={`/buyer/orders/${o.id}`}
            className="group flex min-h-28 flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-white p-5 shadow-card transition-all hover:border-paddy/50 hover:shadow-raised focus-visible:outline-offset-4"
          >
            <div>
              <p className="font-bold tracking-tight">
                {o.ref}: <span className="tnum">{kgf(o.requestedKg)}</span>
              </p>
              <p className="tnum text-sm text-sub">{orderTypeLabel[o.type]} · {peso(orderAmount(o))} {o.finalAmount === null ? "estimated" : "total"} · {dateLabel(o.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={orderTone(o.status)}>{statusLabel[o.status]}</Badge>
              <IconChevronRight className="h-4 w-4 text-sub/50 transition-transform group-hover:translate-x-0.5 group-hover:text-paddy-d" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
