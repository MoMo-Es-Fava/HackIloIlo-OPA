"use client";

import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Button } from "./ui";
import { IconReceipt } from "./icons";

export default function Receipt({ orderId, backHref }: { orderId: string; backHref: string }) {
  const { orders, batches } = useStore();
  const o = orders.find((x) => x.id === orderId);
  if (!o) return <p>Order not found.</p>;
  const b = batches.find((x) => x.id === o.batchId);
  const total = o.kg * o.pricePerKg;
  const rows: [string, string][] = [
    ["Receipt for order", o.id], ["Date", o.createdAt], ["Sold to", o.buyer], ["Sold by", "Iloilo rice processing complex"],
    ["Batch", o.batchId], ["Origin", b ? `${b.farmerId}, validated` : "Recorded"], ["Quantity", kgf(o.kg)],
    ["Price per kg", peso(o.pricePerKg)], ["Status", o.status],
  ];
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 overflow-hidden rounded-2xl border border-line/80 bg-white shadow-raised">
      <div className="flex items-center gap-3 border-b border-line bg-mist/60 p-6">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-paddy-d text-white">
          <IconReceipt className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales receipt</h1>
          <p className="text-sm text-sub">{o.id}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 px-6">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line/70 pb-2">
            <dt className="text-sub">{k}</dt>
            <dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-4 rounded-xl bg-paddy/[0.07] px-3 py-2.5">
          <dt className="self-center font-bold text-paddy-d">Total</dt>
          <dd className="tnum text-2xl font-bold tracking-tight text-paddy-d">{peso(total)}</dd>
        </div>
      </div>
      <p className="px-6 text-[13px] text-sub">Sample receipt for the prototype. Not an official document.</p>
      <div className="no-print flex gap-3 border-t border-line bg-mist/40 p-4">
        <Button arrow onClick={() => window.print()}>Print receipt</Button>
        <a href={backHref} className="inline-flex min-h-12 items-center rounded-xl border border-line bg-white px-5 font-bold text-ink transition-colors hover:bg-mist">Back</a>
      </div>
    </div>
  );
}
