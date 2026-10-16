"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type BatchRecordDto } from "@/lib/api";
import { dateLabel, kgf } from "@/lib/format";
import { Badge, Button, Card, Empty, Notice, PageHeader } from "@/components/ui";
import { IconClipboard } from "@/components/icons";

export default function BadInputs() {
  const [batches, setBatches] = useState<BatchRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setBatches(await api.adminListBadInputs()); setError(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not load bad-input batches."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function restore(id: number) {
    setBusyId(id); setError(null);
    try { await api.restoreBatch(id); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Could not restore the batch."); }
    finally { setBusyId(null); }
  }

  return <div className="flex flex-col gap-5">
    <PageHeader title="Bad-input batches" sub="These batches are kept for audit but hidden from the active processing list. Restore one if it was flagged by mistake." icon={<IconClipboard className="h-6 w-6" />} actions={<Link className="font-bold text-paddy-d underline" href="/staff/processing">Back to batch records</Link>} />
    {error && <Notice tone="warn"><p role="alert">{error}</p></Notice>}
    {loading ? <p role="status">Loading…</p> : batches.length === 0 ? <Empty>No batches are marked as bad input.</Empty> : batches.map((batch) => <Card key={batch.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-bold">{batch.code}</h2><p className="text-sm text-sub">Received {dateLabel(batch.receivedAt)} · {batch.items.map((item) => item.farmerName).join(", ")}</p></div>
        <Badge tone="bad">Bad input</Badge>
      </div>
      <p>{batch.badInputReason || "No reason supplied."}</p>
      <p className="text-sm text-sub">{kgf(batch.wetKg)} input · Previous stage: {batch.statusBeforeBadInput ?? "Received"}</p>
      <div><Button variant="ghost" disabled={busyId === batch.id} onClick={() => void restore(batch.id)}>Restore to batch records</Button></div>
    </Card>)}
  </div>;
}
