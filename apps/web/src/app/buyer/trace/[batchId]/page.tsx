"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { kgf } from "@/lib/format";
import BatchTimeline from "@/components/BatchTimeline";
import { Badge, Card, Empty, PageHeader, stageTone } from "@/components/ui";
import { IconChevronRight, IconTrace } from "@/components/icons";

export default function TraceDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const { batches } = useStore();
  const b = batches.find((x) => x.id === batchId);
  if (!b)
    return (
      <Empty>
        Batch not found.{" "}
        <Link href="/buyer/trace" className="font-bold text-paddy-d hover:underline">
          Try another ID
        </Link>
      </Empty>
    );
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm font-bold text-sub">
        <Link href="/buyer/trace" className="inline-flex min-h-11 items-center hover:text-paddy-d">
          Trace
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
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-sub">Origin</p>
            <p className="font-bold">{b.farmerId}, validated at intake</p>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-sub">Destination</p>
            <p className="font-bold">{b.destination ?? "Not sold yet"}</p>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-bold tracking-tight">Journey</h2>
        <BatchTimeline batch={b} />
      </Card>
    </div>
  );
}
