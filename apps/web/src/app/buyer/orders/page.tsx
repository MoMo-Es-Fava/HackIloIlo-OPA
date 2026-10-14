"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Badge, Button, Empty, PageHeader, orderTone } from "@/components/ui";

const tabs = ["All", "Active", "Delivered", "Cancelled"] as const;

export default function Orders() {
  const { orders, profile } = useStore();
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const mine = orders.filter((o) => o.buyerId === profile.id);
  const list = mine.filter((o) => tab === "All" || (tab === "Active" ? o.status !== "Delivered" && o.status !== "Cancelled" : o.status === tab));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Orders" sub="Track every reservation from offer to delivery." actions={<Link href="/buyer/trace" className="min-h-11 py-2 font-bold text-sky-d underline">Trace a batch</Link>} />
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => <Button key={t} role="tab" aria-selected={tab === t} variant={tab === t ? "primary" : "ghost"} onClick={() => setTab(t)}>{t}</Button>)}
      </div>
      {list.length === 0 && <Empty>No orders here yet.</Empty>}
      <div className="flex flex-col gap-3">
        {list.map((o) => (
          <Link key={o.id} href={`/buyer/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
            <div><p className="font-bold">{o.id}: {kgf(o.kg)}</p><p className="text-sm text-sub">{peso(o.kg * o.pricePerKg)} total. Batch {o.batchId}. {o.createdAt}</p></div>
            <Badge tone={orderTone(o.status)}>{o.status}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
