"use client";

import Link from "next/link";
import { OrderStatus, OrderType } from "@irpc/types";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { orderAmount, statusLabel } from "@/lib/orders";
import { Button } from "./ui";

export default function Receipt({ orderId, backHref }: { orderId: string; backHref: string }) {
  const { orders, orderDetails, batches, profile } = useStore();
  const o = orders.find((row) => row.id === Number(orderId));
  if (!o) return <p>Order not found.</p>;
  if (o.type !== OrderType.BUY_RICE || (o.status !== OrderStatus.PAID && o.status !== OrderStatus.COMPLETED)) {
    return <p>A sales receipt is available after payment. <Link href={backHref} className="font-bold underline">Back</Link></p>;
  }
  const details = orderDetails[o.id];
  const b = batches.find((row) => row.id === details?.batchId);
  const rows: [string, string][] = [
    ["Receipt for order", o.ref], ["Date placed", dateLabel(o.createdAt)],
    ["Sold to", details?.contactName ?? (backHref.startsWith("/buyer/") ? profile.name : "Customer")], ["Sold by", "Iloilo rice processing complex"],
    ["Batch", details?.batchId ?? "Not assigned"], ["Origin", b ? `${b.farmerId}, validated` : "Not recorded"],
    ["Quantity", kgf(o.requestedKg)], ["Price per kg", o.unitPrice === null ? "Not locked" : peso(o.unitPrice)],
    ["Status", statusLabel[o.status]],
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
        <div className="flex justify-between gap-4 pt-1 text-xl font-bold"><dt>Total</dt><dd>{peso(orderAmount(o))}</dd></div>
      </dl>
      <p className="text-sm text-sub">Sample receipt for the prototype. Not an official document.</p>
      <div className="no-print flex gap-3">
        <Button onClick={() => window.print()}>Print receipt</Button>
        <Link href={backHref} className="inline-flex min-h-12 items-center rounded-xl border-2 border-paddy-d px-5 font-bold text-paddy-d">Back</Link>
      </div>
    </div>
  );
}
