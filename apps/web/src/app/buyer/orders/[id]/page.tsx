"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import { ORDER_FLOW } from "@/lib/data";
import { Badge, Button, Card, Empty, PageHeader, orderTone, cn } from "@/components/ui";
import { IconChevronRight, IconCheck, IconTrace, IconReceipt } from "@/components/icons";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { orders, offers, cancelOrder } = useStore();
  const o = orders.find((x) => x.id === id);
  if (!o)
    return (
      <Empty>
        Order not found.{" "}
        <Link href="/buyer/orders" className="font-bold text-paddy-d hover:underline">
          Back to orders
        </Link>
      </Empty>
    );
  const delivery = offers.find((x) => x.id === o.offerId)?.delivery ?? "Pickup at IRPC";
  const idx = ORDER_FLOW.indexOf(o.status);
  const hasReceipt = o.status === "Paid" || o.status === "Ready" || o.status === "Delivered";
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm font-bold text-sub">
        <Link href="/buyer/orders" className="inline-flex min-h-11 items-center hover:text-paddy-d">
          Orders
        </Link>
        <IconChevronRight className="h-4 w-4 text-sub/60" />
        <span className="text-ink">{o.id}</span>
      </nav>
      <PageHeader title={`Order ${o.id}`} sub={`Placed ${o.createdAt}`} actions={<Badge tone={orderTone(o.status)}>{o.status}</Badge>} />
      <Card className="bg-gradient-to-br from-white to-mist/60">
        <p className="text-lg font-bold tracking-tight">
          <span className="tnum">{kgf(o.kg)}</span> at <span className="tnum">{peso(o.pricePerKg)}</span> per kg
        </p>
        <p className="tnum text-3xl font-bold tracking-tight text-paddy-d">Total {peso(o.kg * o.pricePerKg)}</p>
        <p className="text-sub">{delivery}</p>
      </Card>
      <Card>
        <h2 className="text-lg font-bold tracking-tight">Progress</h2>
        {o.status === "Cancelled" ? (
          <p className="text-sub">This order was cancelled.</p>
        ) : (
          <ol className="flex flex-col gap-0">
            {ORDER_FLOW.map((s, i) => {
              const done = i <= idx;
              const current = i === idx;
              return (
                <li key={s} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full border-2 text-[13px] font-bold",
                        done ? "border-paddy-d bg-paddy-d text-white" : "border-line bg-white text-sub",
                      )}
                    >
                      {done ? <IconCheck className="h-4 w-4" /> : i + 1}
                    </span>
                    {i < ORDER_FLOW.length - 1 && (
                      <span aria-hidden className={cn("h-6 w-0.5", done && i < idx ? "bg-paddy-d" : "bg-line")} />
                    )}
                  </div>
                  <span className={cn("pb-6 font-bold", current ? "text-paddy-d" : done ? "text-ink" : "text-sub")}>
                    {s}
                    {!done && <span className="ml-1 text-[13px] font-normal text-sub">(next)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/buyer/trace/${o.batchId}`}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-paddy-d px-5 font-bold text-paddy-d transition-colors hover:bg-mist"
        >
          <IconTrace className="h-[18px] w-[18px]" /> Trace batch {o.batchId}
        </Link>
        {hasReceipt && (
          <Link
            href={`/buyer/orders/${o.id}/receipt`}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-paddy-d px-5 font-bold text-white shadow-[0_6px_16px_-8px_rgba(32,76,54,0.7)] transition-colors hover:bg-paddy"
          >
            <IconReceipt className="h-[18px] w-[18px]" /> View receipt
          </Link>
        )}
        {o.status === "Reserved" && (
          <Button variant="danger" onClick={() => cancelOrder(o.id)}>
            Cancel order
          </Button>
        )}
      </div>
    </div>
  );
}
