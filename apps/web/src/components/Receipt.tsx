"use client";

import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { Button } from "./ui";

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
    <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-2xl border border-line bg-white p-6">
      <h1 className="text-2xl font-bold">Sales receipt</h1>
      <dl className="flex flex-col gap-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-sub">{k}</dt><dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 pt-1 text-xl font-bold"><dt>Total</dt><dd>{peso(total)}</dd></div>
      </dl>
      <p className="text-sm text-sub">Sample receipt for the prototype. Not an official document.</p>
      <div className="no-print flex gap-3">
        <Button onClick={() => window.print()}>Print receipt</Button>
        <a href={backHref} className="inline-flex min-h-12 items-center rounded-xl border-2 border-paddy-d px-5 font-bold text-paddy-d">Back</a>
      </div>
    </div>
  );
}
