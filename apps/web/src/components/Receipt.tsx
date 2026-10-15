"use client";

import Link from "next/link";
import { OrderStatus, OrderType } from "@irpc/types";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { orderAmount, statusLabel } from "@/lib/orders";
import { Button } from "./ui";
import { IconReceipt } from "./icons";

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
    <div className="mx-auto flex max-w-xl flex-col gap-5 overflow-hidden rounded-2xl border border-line/80 bg-white shadow-raised">
      <div className="flex items-center gap-3 border-b border-line bg-mist/60 p-6">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-paddy-d text-white">
          <IconReceipt className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales receipt</h1>
          <p className="text-sm text-sub">{o.ref}</p>
        </div>
      </div>
      <dl className="flex flex-col gap-2 px-6">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line/70 pb-2">
            <dt className="text-sub">{k}</dt>
            <dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-4 rounded-xl bg-paddy/[0.07] px-3 py-2.5">
          <dt className="self-center font-bold text-paddy-d">Total</dt>
          <dd className="tnum text-2xl font-bold tracking-tight text-paddy-d">{peso(orderAmount(o))}</dd>
        </div>
      </dl>
      <p className="px-6 text-sm text-sub">Sample receipt for the prototype. Not an official document.</p>
      <div className="no-print flex gap-3 border-t border-line bg-mist/40 p-4">
        <Button arrow onClick={() => window.print()}>Print receipt</Button>
        <Link href={backHref} className="inline-flex min-h-12 items-center rounded-xl border border-line bg-white px-5 font-bold text-ink transition-colors hover:bg-mist">Back</Link>
      </div>
    </div>
  );
}
