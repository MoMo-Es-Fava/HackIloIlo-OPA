"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { OrderStatus } from "@irpc/types";
import { useStore } from "@/lib/store";
import { peso, kgf, dateLabel } from "@/lib/format";
import { orderAmount, orderSteps, orderTypeLabel, serviceLabel, statusLabel } from "@/lib/orders";
import { Badge, Button, Card, Empty, PageHeader, cn, orderTone } from "@/components/ui";
import { IconCheck, IconChevronRight } from "@/components/icons";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { orders, orderError, cancelOrder } = useStore();
  const o = orders.find((row) => row.id === Number(id));
  if (!o)
    return (
      <Empty>
        Order not found.{" "}
        <Link href="/buyer/orders" className="font-bold text-paddy-d hover:underline">
          Back to orders
        </Link>
      </Empty>
    );
  const steps = orderSteps(o);
  const idx = steps.indexOf(o.status);
  const closed = o.status === OrderStatus.CANCELLED || o.status === OrderStatus.REJECTED;
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm font-bold text-sub">
        <Link href="/buyer/orders" className="inline-flex min-h-11 items-center hover:text-paddy-d">
          Orders
        </Link>
        <IconChevronRight className="h-4 w-4 text-sub/60" />
        <span className="text-ink">{o.ref}</span>
      </nav>
      <PageHeader title={`Order ${o.ref}`} sub={`Placed ${dateLabel(o.createdAt)}`} actions={<Badge tone={orderTone(o.status)}>{statusLabel[o.status]}</Badge>} />
      <Card className="bg-gradient-to-br from-white to-mist/60">
        <p className="text-lg font-bold tracking-tight">{orderTypeLabel[o.type]} · <span className="tnum">{kgf(o.requestedKg)}</span></p>
        {o.unitPrice !== null && <p className="tnum">{peso(o.unitPrice)} per kg (locked)</p>}
        {o.serviceType && <p>{serviceLabel[o.serviceType]}</p>}
        {o.dryingRate !== null && <p className="tnum">Drying: {peso(o.dryingRate)} per kg</p>}
        {o.millingRate !== null && <p className="tnum">Milling: {peso(o.millingRate)} per kg</p>}
        <p className="text-sm text-sub">{o.finalAmount === null ? "Estimated amount" : "Final amount"}</p>
        <p className="tnum text-3xl font-bold tracking-tight text-paddy-d">{peso(orderAmount(o))}</p>
        <p className="text-sub">Preferred date: {dateLabel(o.preferredDate)}</p>
        {o.scheduledDate && <p className="font-bold">Confirmed date: {dateLabel(o.scheduledDate)}</p>}
      </Card>
      <Card>
        <h2 className="text-lg font-bold tracking-tight">Progress</h2>
        {closed ? (
          <p className="text-sub">{statusLabel[o.status]}{o.rejectReason ? `: ${o.rejectReason}` : "."}</p>
        ) : (
          <ol className="flex flex-col gap-0">
            {steps.map((status, i) => {
              const done = i <= idx;
              const current = i === idx;
              return (
                <li key={status} className="flex items-center gap-3" aria-current={current ? "step" : undefined}>
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border-2 text-[13px] font-bold",
                        done ? "border-paddy-d bg-paddy-d text-white" : "border-line bg-white text-sub",
                      )}
                    >
                      {done ? <IconCheck className="h-4 w-4" /> : i + 1}
                    </span>
                    {i < steps.length - 1 && (
                      <span aria-hidden className={cn("h-6 w-0.5", done && i < idx ? "bg-paddy-d" : "bg-line")} />
                    )}
                  </div>
                  <span className={cn("pb-6 font-bold", current ? "text-paddy-d" : done ? "text-ink" : "text-sub")}>
                    {statusLabel[status]}
                    {!done && <span className="ml-1 text-[13px] font-normal text-sub">(next)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
      {orderError && <p role="alert" className="text-clay">{orderError}</p>}
      <div className="flex flex-wrap gap-3">
        {o.status === OrderStatus.PENDING && (
          <Button variant="danger" onClick={() => cancelOrder(o.id)}>
            Cancel order
          </Button>
        )}
      </div>
    </div>
  );
}
