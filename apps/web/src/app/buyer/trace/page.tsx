"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, PageHeader, TextField } from "@/components/ui";
import { IconTrace, IconChevronRight } from "@/components/icons";

export default function TraceSearch() {
  const router = useRouter();
  const { batches, orders, orderDetails } = useStore();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string>();
  const mine = Array.from(new Set(orders.map((o) => orderDetails[o.id]?.batchId).filter((id): id is string => Boolean(id))));

  const go = () => {
    const id = q.trim().toUpperCase();
    if (!batches.some((b) => b.id === id)) return setError("No batch with that ID. Check the ID on your receipt.");
    router.push(`/buyer/trace/${id}`);
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trace a batch" sub="See every step from first buy to sale." icon={<IconTrace className="h-6 w-6" />} />
      <Card>
        <TextField
          label="Batch ID"
          placeholder="IR-1014-027"
          value={q}
          error={error}
          onChange={(e) => { setQ(e.target.value); setError(undefined); }}
          onKeyDown={(e) => e.key === "Enter" && go()}
        />
        <Button arrow disabled={!q.trim()} onClick={go}>
          Trace
        </Button>
      </Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-tight">Batches in your orders</h2>
        {mine.length === 0 ? (
          <p className="text-sub">Your ordered batches will appear here for quick access.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {mine.map((id) => (
              <Link
                key={id}
                href={`/buyer/trace/${id}`}
                className="group flex min-h-12 items-center justify-between rounded-xl border border-line/80 bg-white px-4 font-bold shadow-card transition-all hover:border-paddy/50 hover:shadow-raised"
              >
                <span className="tnum">{id}</span>
                <IconChevronRight className="h-4 w-4 text-sub/50 transition-transform group-hover:translate-x-0.5 group-hover:text-paddy-d" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
