"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { ORDER_FLOW } from "@/lib/data";
import { Badge, Button, Card, Empty, PageHeader, orderTone } from "@/components/ui";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { orders, offers, cancelOrder } = useStore();
  const o = orders.find((x) => x.id === id);
  if (!o) return <Empty>Order not found. <Link href="/buyer/orders" className="font-bold underline">Back to orders</Link></Empty>;
  const delivery = offers.find((x) => x.id === o.offerId)?.delivery ?? "Pickup at IRPC";
  const idx = ORDER_FLOW.indexOf(o.status);
  const hasReceipt = o.status === "Paid" || o.status === "Ready" || o.status === "Delivered";
  return (
    <div className="flex flex-col gap-6">
      <Link href="/buyer/orders" className="min-h-11 py-2 font-bold text-sky-d underline">Back to orders</Link>
      <PageHeader title={`Order ${o.id}`} sub={`Placed ${o.createdAt}`} actions={<Badge tone={orderTone(o.status)}>{o.status}</Badge>} />
      <Card>
        <p className="text-lg font-bold">{kgf(o.kg)} at {peso(o.pricePerKg)} per kg</p>
        <p className="text-2xl font-bold">Total {peso(o.kg * o.pricePerKg)}</p>
        <p className="text-sub">{delivery}</p>
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Progress</h2>
        {o.status === "Cancelled" ? <p>This order was cancelled.</p> : (
          <ol className="flex flex-wrap gap-2">
            {ORDER_FLOW.map((s, i) => <li key={s}><Badge tone={i <= idx ? "ok" : "neutral"}>{s}{i <= idx ? "" : " (next)"}</Badge></li>)}
          </ol>
        )}
      </Card>
      <div className="flex flex-wrap gap-3">
        <Link href={`/buyer/trace/${o.batchId}`} className="inline-flex min-h-12 items-center rounded-xl border-2 border-paddy-d px-5 font-bold text-paddy-d">Trace batch {o.batchId}</Link>
        {hasReceipt && <Link href={`/buyer/orders/${o.id}/receipt`} className="inline-flex min-h-12 items-center rounded-xl bg-paddy-d px-5 font-bold text-white">View receipt</Link>}
        {o.status === "Reserved" && <Button variant="danger" onClick={() => cancelOrder(o.id)}>Cancel order</Button>}
      </div>
    </div>
  );
}
