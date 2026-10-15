"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Badge, Empty, PageHeader, SelectField, TextField } from "@/components/ui";
import { IconBag } from "@/components/icons";

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
      <PageHeader
        title="Offers"
        sub="Browse rice that IRPC has ready to sell."
        icon={<IconBag className="h-6 w-6" />}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <TextField label="Search" placeholder="Offer, batch or grade" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <SelectField label="Delivery" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
          <option>All</option><option>Pickup at IRPC</option><option>Municipal drop point</option>
        </SelectField>
        <TextField label="Maximum price per kg" type="number" inputMode="decimal" min={0} value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sub" aria-live="polite">
          <span className="tnum font-bold text-ink">{list.length}</span> offer{list.length === 1 ? "" : "s"} found
        </p>
        {(q || delivery !== "All" || max) && (
          <button
            type="button"
            onClick={() => { setQ(""); setDelivery("All"); setMax(""); }}
            className="inline-flex min-h-11 items-center rounded-lg px-3 font-bold text-paddy-d underline-offset-4 hover:bg-mist hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
      {list.length === 0 && <Empty>No offers match your filters. Adjust them or clear all filters to see available rice.</Empty>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((o) => (
          <Link
            key={o.id}
            href={`/buyer/offers/${o.id}`}
            className="group flex flex-col gap-3 rounded-2xl border border-line/80 bg-white p-5 shadow-card transition-all hover:border-paddy/50 hover:shadow-raised focus-visible:outline-offset-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold tracking-tight">{o.grade}</p>
              <Badge tone="info">Offer {o.id}</Badge>
            </div>
            <p className="tnum text-2xl font-bold tracking-tight text-paddy-d">{peso(o.pricePerKg)}<span className="text-base font-normal text-sub"> per kg</span></p>
            <p className="tnum">{kgf(o.kgAvailable)} available</p>
            <p className="text-sm text-sub">{o.delivery}. Origin batch {o.batchId}. Posted {o.posted}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
