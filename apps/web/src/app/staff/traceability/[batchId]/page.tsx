"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { peso, kgf } from "@/lib/format";
import BatchTimeline from "@/components/BatchTimeline";
import { Badge, Card, Empty, PageHeader, stageTone } from "@/components/ui";
import { IconChevronRight, IconTrace } from "@/components/icons";

export default function BatchThread() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, orders } = useStore();
  const b = batches.find((x) => x.id === batchId);
  if (!b)
    return (
      <Empty>
        Batch not found.{" "}
        <Link href="/staff/traceability" className="font-bold text-paddy-d hover:underline">
          Back to search
        </Link>
      </Empty>
    );
  const related = orders.filter((o) => o.batchId === b.id);
  return (
    <>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm font-bold text-sub">
        <Link href="/staff/traceability" className="inline-flex min-h-11 items-center hover:text-paddy-d">
          Batch search
        </Link>
        <IconChevronRight className="h-4 w-4 text-sub/60" />
        <span className="tnum text-ink">{b.id}</span>
      </nav>
      <PageHeader
        title={`Batch ${b.id}`}
        sub={`${kgf(b.kg)} ${b.type.toLowerCase()} palay`}
        icon={<IconTrace className="h-6 w-6" />}
        actions={<Badge tone={stageTone(b.stage)}>{b.stage}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold tracking-tight">Accountability</h2>
          <div className="flex flex-col gap-2">
            <p className="flex justify-between gap-4"><span className="text-sub">Sold by:</span> <b>{b.farmer} ({b.farmerId})</b></p>
            <p className="flex justify-between gap-4"><span className="text-sub">Sold to:</span> <b>{b.soldTo ?? "Not sold yet"}</b></p>
            <p className="flex justify-between gap-4"><span className="text-sub">Destination:</span> <b>{b.destination ?? "None"}</b></p>
            <p className="flex justify-between gap-4"><span className="text-sub">Cost per kg:</span> <b className="tnum">{b.costPerKg > 0 ? peso(b.costPerKg) : "Not calculated yet"}</b></p>
          </div>
          {related.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              <h3 className="font-bold">Orders</h3>
              {related.map((o) => <p key={o.id}><Link className="font-bold text-paddy-d hover:underline" href={`/staff/sales/${o.id}`}>{o.id}</Link> <span className="tnum">{kgf(o.kg)}</span> to {o.buyer} ({o.status})</p>)}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-bold tracking-tight">Batch thread</h2>
          <BatchTimeline batch={b} />
        </Card>
      </div>
    </>
  );
}
