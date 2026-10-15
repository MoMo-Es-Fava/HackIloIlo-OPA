"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Badge, Empty, PageHeader, orderTone, cn } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";

const tabs = ["All", "Active", "Delivered", "Cancelled"] as const;

export default function Orders() {
  const { orders, profile } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const mine = orders.filter((o) => o.buyerId === profile.id);
  const list = mine.filter((o) => tab === "All" || (tab === "Active" ? o.status !== "Delivered" && o.status !== "Cancelled" : o.status === tab));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        sub="Track every reservation from offer to delivery."
        actions={
          <Link href="/buyer/trace" className="group inline-flex min-h-11 items-center gap-1.5 font-bold text-paddy-d hover:gap-2.5">
            Trace a batch <IconChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-line/80 bg-white p-1.5 shadow-card sm:w-fit" role="tablist">
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
      {list.length === 0 && <Empty>No orders here yet.</Empty>}
      <div className="flex flex-col gap-3">
        {list.map((o) => (
          <Link
            key={o.id}
            href={`/buyer/orders/${o.id}`}
            className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/80 bg-white p-4 shadow-card transition-all hover:border-paddy/50 hover:shadow-raised"
          >
            <div>
              <p className="font-bold tracking-tight">
                {o.id}: <span className="tnum">{kgf(o.kg)}</span>
              </p>
              <p className="tnum text-sm text-sub">{peso(o.kg * o.pricePerKg)} total. Batch {o.batchId}. {o.createdAt}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={orderTone(o.status)}>{o.status}</Badge>
              <IconChevronRight className="h-4 w-4 text-sub/50 transition-transform group-hover:translate-x-0.5 group-hover:text-paddy-d" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
