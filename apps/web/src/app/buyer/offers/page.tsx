"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Badge, Empty, PageHeader, SelectField, TextField } from "@/components/ui";

export default function Offers() {
  const { offers } = useStore();
  const [q, setQ] = useState("");
  const [delivery, setDelivery] = useState("All");
  const [max, setMax] = useState("");
  const list = useMemo(
    () => offers.filter((o) =>
      o.kgAvailable > 0 &&
      (delivery === "All" || o.delivery === delivery) &&
      (!max || o.pricePerKg <= Number(max)) &&
      (!q || `${o.id} ${o.batchId} ${o.grade}`.toLowerCase().includes(q.toLowerCase())),
    ),
    [offers, q, delivery, max],
  );
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Offers" sub="Rice posted by IRPC. Choose a rice type to see current stock and price." />
      <div className="grid gap-3 md:grid-cols-3">
        <TextField label="Search" placeholder="Offer, batch or grade" value={q} onChange={(e) => setQ(e.target.value)} />
        <SelectField label="Delivery" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
          <option>All</option><option>Pickup at IRPC</option><option>Municipal drop point</option>
        </SelectField>
        <TextField label="Max price per kg" type="number" inputMode="decimal" min={0} value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
      <p className="text-sub" aria-live="polite">{list.length} offer{list.length === 1 ? "" : "s"} found</p>
      {list.length === 0 && <Empty>No offers match. Clear a filter to see more.</Empty>}
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((o) => (
          <Link key={o.id} href={`/buyer/offers/${o.id}`} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 hover:border-sky-d">
            <div className="flex items-center justify-between"><p className="text-lg font-bold">{o.grade}</p><Badge tone="info">{o.id}</Badge></div>
            <p className="text-2xl font-bold">{peso(o.pricePerKg)}<span className="text-base font-normal text-sub"> per kg</span></p>
            <p>{kgf(o.kgAvailable)} available</p>
            <p className="text-sm text-sub">{o.delivery}{o.batchId ? `. Origin batch ${o.batchId}` : ""}{o.posted ? `. Posted ${o.posted}` : ""}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
