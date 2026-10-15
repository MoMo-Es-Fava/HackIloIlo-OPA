"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { kgf } from "@/lib/format";
import type { GrainType } from "@/lib/demo-types";
import { Badge, Button, Card, Empty, PageHeader, SelectField, TextField, bookingTone, Notice } from "@/components/ui";
import { IconScale } from "@/components/icons";

export default function Intake() {
  const { bookings, slots, weighIn } = useStore();
  const waiting = bookings.filter((b) => b.status === "Confirmed" || b.status === "Checked in");
  const [id, setId] = useState("");
  const [kg, setKg] = useState("");
  const [type, setType] = useState<GrainType>("Fresh");
  const [verified, setVerified] = useState(false);
  const [result, setResult] = useState<{ batch: string; kg: number } | null>(null);
  const sel = waiting.find((b) => b.id === id);
  const n = Number(kg);

  const pick = (bookingId: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    setId(bookingId); setVerified(false); setResult(null);
    if (b) { setKg(String(b.kg)); setType(b.type); }
  };
  const submit = async () => {
    const batch = await weighIn(id, n, type);
    if (batch) { setResult({ batch, kg: n }); setId(""); setKg(""); setVerified(false); }
  };

  return (
    <>
      <PageHeader title="Weigh-in and bag slips" sub="Validate the farmer, record the weight and issue bag slips. This creates the batch." icon={<IconScale className="h-6 w-6" />} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold tracking-tight">Waiting at the gate</h2>
          {waiting.length === 0 && <Empty>Nobody waiting. New check-ins appear here.</Empty>}
          {waiting.map((b) => (
            <button key={b.id} type="button" onClick={() => pick(b.id)} aria-pressed={id === b.id}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4 text-left shadow-card transition-all ${id === b.id ? "border-paddy-d bg-mist" : "border-line/80 hover:border-paddy/50 hover:shadow-raised"}`}>
              <span><b>{b.farmer}</b> ({b.farmerId})<br /><span className="text-sm text-sub">{b.id}. {slots.find((s) => s.id === b.slotId)?.time}. About {kgf(b.kg)}</span></span>
              <Badge tone={bookingTone(b.status)}>{b.status}</Badge>
            </button>
          ))}
        </div>
        <Card>
          <h2 className="text-lg font-bold tracking-tight">Record weight</h2>
          {!sel ? <p className="text-sub">Select a booking on the left.</p> : (
            <>
              <p className="font-bold">{sel.farmer} ({sel.farmerId})</p>
              <label className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-line p-3 transition-colors hover:border-sub/50">
                <input type="checkbox" className="h-5 w-5 accent-paddy-d" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
                <span>Farmer ID checked and validated</span>
              </label>
              <TextField label="Weighed (kg)" type="number" inputMode="decimal" min={1} value={kg} onChange={(e) => setKg(e.target.value)} error={kg !== "" && !(n > 0) ? "Enter a weight above 0" : undefined} />
              <SelectField label="Grain" value={type} onChange={(e) => setType(e.target.value as GrainType)}><option>Fresh</option><option>Dry</option></SelectField>
              <p>Bag slips to print: <b className="tnum">{n > 0 ? Math.ceil(n / 50) : 0}</b> <span className="text-sm text-sub">(assumes 50 kg bags)</span></p>
              <Button arrow disabled={!verified || !(n > 0)} onClick={submit}>Create batch and bag slips</Button>
            </>
          )}
          {result && (
            <Notice tone="ok">
              <p className="mt-1"><Badge tone="ok">Batch created</Badge></p>
              <p className="mt-2">Batch <Link className="font-bold text-paddy-d hover:underline" href={`/staff/traceability/${result.batch}`}>{result.batch}</Link>: {kgf(result.kg)}, {Math.ceil(result.kg / 50)} bag slips.</p>
            </Notice>
          )}
        </Card>
      </div>
    </>
  );
}
