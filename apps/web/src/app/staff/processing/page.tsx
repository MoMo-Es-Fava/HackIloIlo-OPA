"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, type BatchRecordDto, type EligibleBatchOrderDto } from "@/lib/api";
import { dateLabel, kgf, peso } from "@/lib/format";
import { Badge, Button, Card, Empty, Notice, PageHeader, TextField } from "@/components/ui";
import { IconFlame } from "@/components/icons";

const statusLabel: Record<string, string> = {
  NONE: "Received", DRYING: "Drying", MILLING: "Milling", COMPLETE: "Complete",
  BAD_INPUT: "Bad input", DAMAGED: "Written off",
};
const statusTone = (status: string): "ok" | "warn" | "bad" | "info" | "neutral" =>
  status === "COMPLETE" ? "ok" : status === "BAD_INPUT" || status === "DAMAGED" ? "bad" : status === "NONE" ? "neutral" : "warn";
const positive = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) > 0;

export default function Processing() {
  const [batches, setBatches] = useState<BatchRecordDto[]>([]);
  const [eligible, setEligible] = useState<EligibleBatchOrderDto[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [rows, orders] = await Promise.all([api.adminListBatches(), api.adminEligibleBatchOrders()]);
      setBatches(rows);
      setEligible(orders);
      setSelected((ids) => ids.filter((id) => orders.some((order) => order.id === id)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load batch records.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selectedCondition = useMemo(() => {
    const picked = eligible.find((order) => selected.includes(order.id));
    return picked?.palayCondition ?? null;
  }, [eligible, selected]);
  const selectedKg = eligible.filter((order) => selected.includes(order.id)).reduce((sum, order) => sum + Number(order.kg), 0);
  const setDraft = (key: string, value: string) => setDrafts((draft) => ({ ...draft, [key]: value }));

  async function mutate(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(null); setNotice(null);
    try { await action(); setNotice(success); setDrafts({}); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "The batch change could not be saved."); }
    finally { setBusy(false); }
  }

  const startMilling = (batch: BatchRecordDto) =>
    mutate(() => api.startBatchMilling(batch.id, drafts[`${batch.id}:dryKg`]), `Batch ${batch.code} moved to milling.`);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Batch records" sub="Group confirmed palay purchases, track drying and milling, and record losses with a reason." icon={<IconFlame className="h-6 w-6" />} actions={<Link className="font-bold text-paddy-d underline" href="/staff/bad-inputs">View bad-input batches</Link>} />
      {error && <Notice tone="warn"><p role="alert">{error}</p></Notice>}
      {notice && <Notice tone="ok"><p role="status">{notice}</p></Notice>}

      <Card>
        <h2 className="text-lg font-bold">Create a batch from weighed palay</h2>
        <p className="text-sm text-sub">Only confirmed purchases not already assigned to a batch appear here. Fresh and dry palay must be batched separately; dry palay can go directly to milling.</p>
        {eligible.length === 0 ? <Empty>No confirmed palay purchases are waiting to be batched.</Empty> : (
          <div className="max-h-72 overflow-auto rounded-xl border border-line">
            {eligible.map((order) => {
              const checked = selected.includes(order.id);
              const incompatible = selectedCondition !== null && order.palayCondition !== selectedCondition;
              return (
                <label key={order.id} className="flex min-h-12 items-center gap-3 border-b border-line/70 px-3 last:border-0">
                  <input type="checkbox" className="h-4 w-4 accent-paddy-d" checked={checked} disabled={incompatible || busy}
                    onChange={(event) => setSelected((ids) => event.target.checked ? [...ids, order.id] : ids.filter((id) => id !== order.id))} />
                  <span className="min-w-0 flex-1"><b>IRPC-{String(order.id).padStart(4, "0")}</b> · {order.farmerName}{order.variety ? ` · ${order.variety}` : ""}</span>
                  <span className="text-sm text-sub">{order.palayCondition === "DRY" ? "Dry" : "Fresh"} · {kgf(order.kg)}</span>
                </label>
              );
            })}
          </div>
        )}
        {selected.length > 0 && <p className="text-sm">Selected: {selected.length} purchase(s), {kgf(selectedKg)} {selectedCondition === "DRY" ? "dry" : "fresh"} palay</p>}
        <div><Button disabled={busy || selected.length === 0 || loading} onClick={() => mutate(async () => { await api.createBatch(selected); setSelected([]); }, "Batch created.")}>Create batch</Button></div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Active and processed batches</h2>
        {loading ? <p role="status">Loading batches…</p> : batches.length === 0 ? <Empty>No batches yet. Create one from a weighed palay purchase above.</Empty> : (
          <div className="grid gap-3">
            {batches.map((batch) => {
              const inputKg = Number(batch.wetKg);
              const itemSource = [...new Set(batch.items.map((item) => item.farmerName))].join(", ");
              const canDamage = batch.status === "NONE" || batch.status === "COMPLETE";
              return (
                <Card key={batch.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><Link className="text-lg font-bold text-paddy-d hover:underline" href={`/staff/traceability/${batch.id}`}>{batch.code}</Link><p className="text-sm text-sub">{itemSource || "Palay purchase"} · received {dateLabel(batch.receivedAt)} · {batch.items.length} source order(s)</p></div>
                    <Badge tone={statusTone(batch.status)}>{statusLabel[batch.status] ?? batch.status}</Badge>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-4">
                    <p>Input: <b className="tnum">{kgf(batch.wetKg)}</b></p>
                    <p>Dried: <b className="tnum">{batch.dryKg ? kgf(batch.dryKg) : "Not recorded"}</b></p>
                    <p>Milled: <b className="tnum">{batch.riceKg ? kgf(batch.riceKg) : "Not recorded"}</b></p>
                    <p>Damaged: <b className="tnum">{kgf(batch.damagedKg)}</b></p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {batch.status === "NONE" && !batch.dryKg && <Button disabled={busy} onClick={() => mutate(() => api.startBatchDrying(batch.id), `Drying started for ${batch.code}.`)}>Start drying</Button>}
                    {batch.status === "NONE" && !!batch.dryKg && <Button disabled={busy} onClick={() => void startMilling(batch)}>Start milling (dry palay)</Button>}
                    {batch.status === "DRYING" && <div className="flex flex-wrap items-end gap-2"><TextField label="Dried palay (kg)" type="number" min="0.01" step="0.01" value={drafts[`${batch.id}:dryKg`] ?? ""} onChange={(e) => setDraft(`${batch.id}:dryKg`, e.target.value)} /><Button disabled={busy || !positive(drafts[`${batch.id}:dryKg`] ?? "")} onClick={() => void startMilling(batch)}>Finish drying and start milling</Button></div>}
                    {batch.status === "MILLING" && <div className="flex flex-wrap items-end gap-2"><TextField label="Milled rice (kg)" type="number" min="0.01" step="0.01" value={drafts[`${batch.id}:riceKg`] ?? ""} onChange={(e) => setDraft(`${batch.id}:riceKg`, e.target.value)} /><Button disabled={busy || !positive(drafts[`${batch.id}:riceKg`] ?? "")} onClick={() => mutate(() => api.completeBatchMilling(batch.id, drafts[`${batch.id}:riceKg`]), `Milling completed for ${batch.code}.`)}>Complete milling</Button></div>}
                    {batch.status === "COMPLETE" && <p className="rounded-lg bg-mist px-3 py-2 text-sm">Processing completed. Total recorded cost: <b>{peso(batch.totalCost)}</b>.</p>}
                    {batch.status === "DAMAGED" && <p className="rounded-lg bg-clay-l px-3 py-2 text-sm text-clay">This batch was fully written off after damage.</p>}
                  </div>
                  {canDamage && <details className="rounded-xl border border-line px-3 py-2"><summary className="cursor-pointer font-bold">Record partial damage</summary><div className="mt-3 flex flex-wrap items-end gap-2"><TextField label="Damaged kg" type="number" min="0.01" step="0.01" value={drafts[`${batch.id}:damageKg`] ?? ""} onChange={(e) => setDraft(`${batch.id}:damageKg`, e.target.value)} /><TextField label="Note (optional)" value={drafts[`${batch.id}:damageNote`] ?? ""} onChange={(e) => setDraft(`${batch.id}:damageNote`, e.target.value)} /><Button variant="danger" disabled={busy || !positive(drafts[`${batch.id}:damageKg`] ?? "")} onClick={() => mutate(() => api.recordBatchDamage(batch.id, drafts[`${batch.id}:damageKg`], drafts[`${batch.id}:damageNote`]), `Damage recorded for ${batch.code}.`)}>Save damage</Button></div></details>}
                  {batch.status !== "DAMAGED" && <details className="rounded-xl border border-line px-3 py-2"><summary className="cursor-pointer font-bold text-clay">Move batch to bad-input list</summary><div className="mt-3 flex flex-wrap items-end gap-2"><TextField label="Reason" value={drafts[`${batch.id}:badReason`] ?? ""} onChange={(e) => setDraft(`${batch.id}:badReason`, e.target.value)} /><Button variant="danger" disabled={busy || (drafts[`${batch.id}:badReason`] ?? "").trim().length < 3} onClick={() => mutate(() => api.markBatchBadInput(batch.id, drafts[`${batch.id}:badReason`]), `${batch.code} moved to bad-input batches.`)}>Mark as bad input</Button></div></details>}
              </Card>
            );
          })}
        </div>
        )}
      </section>
    </div>
  );
}
