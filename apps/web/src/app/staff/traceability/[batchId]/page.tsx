"use client";

import { statusLabel } from "@/lib/orders";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import BatchTimeline from "@/components/BatchTimeline";
import { Badge, Card, Empty, PageHeader, stageTone } from "@/components/ui";

export default function BatchThread() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, orders, orderDetails } = useStore();
  const b = batches.find((x) => x.id === batchId);
  if (!b) return <Empty>Batch not found. <Link href="/staff/traceability" className="font-bold underline">Back to search</Link></Empty>;
  const related = orders.filter((o) => orderDetails[o.id]?.batchId === b.id);
  return (
    <>
      <Link href="/staff/traceability" className="min-h-11 py-2 font-bold text-sky-d underline">Back to search</Link>
      <PageHeader title={`Batch ${b.id}`} sub={`${kgf(b.kg)} ${b.type.toLowerCase()} palay`} actions={<Badge tone={stageTone(b.stage)}>{b.stage}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Accountability</h2>
          <p><span className="text-sub">Sold by:</span> <b>{b.farmer} ({b.farmerId})</b></p>
          <p><span className="text-sub">Sold to:</span> <b>{b.soldTo ?? "Not sold yet"}</b></p>
          <p><span className="text-sub">Destination:</span> <b>{b.destination ?? "None"}</b></p>
          <p><span className="text-sub">Cost per kg:</span> <b>{b.costPerKg > 0 ? peso(b.costPerKg) : "Not calculated yet"}</b></p>
          {related.length > 0 && <><h3 className="mt-2 font-bold">Orders</h3>{related.map((o) => <p key={o.id}><Link className="font-bold underline" href={`/staff/sales/${o.id}`}>{o.ref}</Link> {kgf(o.requestedKg)} to {orderDetails[o.id]?.contactName ?? "Customer"} ({statusLabel[o.status]})</p>)}</>}
        </Card>
        <Card><h2 className="text-lg font-bold">Batch thread</h2><BatchTimeline batch={b} /></Card>
      </div>
    </>
  );
}
