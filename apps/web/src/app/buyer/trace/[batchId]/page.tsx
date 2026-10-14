"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { kgf } from "@/lib/format";
import BatchTimeline from "@/components/BatchTimeline";
import { Badge, Card, Empty, PageHeader, stageTone } from "@/components/ui";

export default function TraceDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batches } = useStore();
  const b = batches.find((x) => x.id === batchId);
  if (!b) return <Empty>Batch not found. <Link href="/buyer/trace" className="font-bold underline">Try another ID</Link></Empty>;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/buyer/trace" className="min-h-11 py-2 font-bold text-sky-d underline">Back to trace</Link>
      <PageHeader title={`Batch ${b.id}`} sub={`${kgf(b.kg)} ${b.type.toLowerCase()} palay`} actions={<Badge tone={stageTone(b.stage)}>{b.stage}</Badge>} />
      <Card>
        <p><span className="text-sub">Origin:</span> <b>{b.farmerId}</b>, validated at intake</p>
        <p><span className="text-sub">Destination:</span> <b>{b.destination ?? "Not sold yet"}</b></p>
      </Card>
      <Card><h2 className="text-lg font-bold">Journey</h2><BatchTimeline batch={b} /></Card>
    </div>
  );
}
