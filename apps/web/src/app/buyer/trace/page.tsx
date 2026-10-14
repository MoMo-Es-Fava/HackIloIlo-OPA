"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button, Card, PageHeader, TextField } from "@/components/ui";

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
      <PageHeader title="Trace a batch" sub="See every step from first buy to sale." />
      <Card>
        <TextField label="Batch ID" placeholder="IR-1014-027" value={q} error={error} onChange={(e) => { setQ(e.target.value); setError(undefined); }} onKeyDown={(e) => e.key === "Enter" && go()} />
        <Button onClick={go} disabled={!q.trim()}>Trace</Button>
      </Card>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Batches in your orders</h2>
        {mine.map((id) => <Link key={id} href={`/buyer/trace/${id}`} className="min-h-12 rounded-xl border border-line bg-white p-3 font-bold">{id}</Link>)}
      </section>
    </div>
  );
}
