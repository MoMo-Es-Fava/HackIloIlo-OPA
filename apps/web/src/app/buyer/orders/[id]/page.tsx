"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { OrderStatus, OrderType } from "@irpc/types";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { orderAmount, orderSteps, orderTypeLabel, serviceLabel, statusLabel } from "@/lib/orders";
import { Badge, Button, Card, Empty, PageHeader, orderTone } from "@/components/ui";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { orders, orderDetails, orderError, cancelOrder } = useStore();
  const o = orders.find((row) => row.id === Number(id));
  if (!o) return <Empty>Order not found. <Link href="/buyer/orders" className="font-bold underline">Back to orders</Link></Empty>;
  const details = orderDetails[o.id];
  const steps = orderSteps(o);
  const idx = steps.indexOf(o.status);
  const hasReceipt = o.type === OrderType.BUY_RICE && (o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED);
  const closed = o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/buyer/orders" className="min-h-11 py-2 font-bold text-sky-d underline">Back to orders</Link>
      <PageHeader title={`Order ${o.ref}`} sub={`Placed ${dateLabel(o.createdAt)}`} actions={<Badge tone={orderTone(o.status)}>{statusLabel[o.status]}</Badge>} />
      <Card>
        <p className="text-lg font-bold">{orderTypeLabel[o.type]} · {kgf(o.requestedKg)}</p>
        {o.unitPrice !== null && <p>{peso(o.unitPrice)} per kg (locked)</p>}
        {o.serviceType && <p>{serviceLabel[o.serviceType]}</p>}
        {o.dryingRate !== null && <p>Drying: {peso(o.dryingRate)} per kg</p>}
        {o.millingRate !== null && <p>Milling: {peso(o.millingRate)} per kg</p>}
        <p className="text-2xl font-bold">{o.finalAmount === null ? "Estimated amount" : "Final amount"} {peso(orderAmount(o))}</p>
        <p className="text-sub">Preferred: {dateLabel(o.preferredDate)}</p>
        {o.scheduledDate && <p className="text-sub">Confirmed: {dateLabel(o.scheduledDate)}</p>}
      </Card>
      <Card>
        <h2 className="text-lg font-bold">Progress</h2>
        {closed ? <p>{statusLabel[o.status]}{o.rejectReason ? `: ${o.rejectReason}` : "."}</p> : (
          <ol className="flex flex-wrap gap-2">
            {steps.map((status, index) => <li key={status} aria-current={status === o.status ? "step" : undefined}><Badge tone={index <= idx ? "ok" : "neutral"}>{statusLabel[status]}{index > idx ? " (next)" : ""}</Badge></li>)}
          </ol>
        )}
      </Card>
      {orderError && <p role="alert" className="text-clay">{orderError}</p>}
      <div className="flex flex-wrap gap-3">
        {details?.batchId && <Link href={`/buyer/trace/${details.batchId}`} className="inline-flex min-h-12 items-center rounded-xl border-2 border-paddy-d px-5 font-bold text-paddy-d">Trace batch {details.batchId}</Link>}
        {hasReceipt && <Link href={`/buyer/orders/${o.id}/receipt`} className="inline-flex min-h-12 items-center rounded-xl bg-paddy-d px-5 font-bold text-white">View receipt</Link>}
        {o.status === OrderStatus.PENDING && <Button variant="danger" onClick={() => cancelOrder(o.id)}>Cancel order</Button>}
      </div>
    </div>
  );
}
