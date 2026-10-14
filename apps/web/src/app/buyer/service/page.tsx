"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { kgf } from "@/lib/format";
import type { ServiceKind } from "@/lib/data";
import { Badge, Button, Card, Empty, PageHeader, SelectField, TextField, type Tone } from "@/components/ui";

const tone: Record<string, Tone> = { Pending: "warn", Approved: "ok", Declined: "bad" };

export default function Service() {
  const { serviceRequests, profile, addServiceRequest } = useStore();
  const [service, setService] = useState<ServiceKind>("Drying");
  const [kg, setKg] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);
  const mine = serviceRequests.filter((s) => s.buyerId === profile.id);
  const kgErr = kg !== "" && !(Number(kg) > 0) ? "Enter a quantity above 0" : undefined;
  const ok = Number(kg) > 0 && Boolean(date);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Drying and milling" sub="Tell us what you need. The IRPC team will review your request and confirm availability." />
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold">What do you need?</h2>
            <p className="text-sm text-sub">Choose a service. No fee is charged until IRPC confirms your request.</p>
          </div>
          <SelectField label="Service" value={service} onChange={(e) => { setService(e.target.value as ServiceKind); setSentId(null); }}>
            <option>Drying</option><option>Milling</option><option>Storage</option>
          </SelectField>
          <TextField
            label="Estimated quantity (kg)"
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            value={kg}
            error={kgErr}
            hint={Number(kg) > 0 ? `About ${(Number(kg) / 50).toFixed(1)} 50 kg sacks. This is an estimate.` : "If you know the number of 50 kg sacks, multiply by 50 to estimate the weight."}
            onChange={(e) => { setKg(e.target.value); setSentId(null); }}
          />
          <TextField label="Preferred date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setSentId(null); }} />
          <TextField label="Notes (optional)" placeholder="Anything the staff should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="rounded-xl bg-mist p-4 text-sm">
            <p className="font-bold">Request for {profile.name}</p>
            <p className="mt-1 text-sub">Your request is not booked until the IRPC team approves it.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!ok} onClick={() => { const id = addServiceRequest(service, Number(kg), date, notes); setKg(""); setDate(""); setNotes(""); setSentId(id); }}>
              Send request
            </Button>
            <p className="text-sm text-sub">You can check the request status below.</p>
          </div>
          {sentId && (
            <div role="status" className="rounded-xl border border-paddy/30 bg-mist p-4">
              <p className="font-bold text-paddy-d">Request {sentId} sent to IRPC</p>
              <p className="mt-1 text-sm text-sub">The team will review it and update the status here. This demo does not send SMS.</p>
            </div>
          )}
        </div>
      </Card>
      <div>
        <h2 className="text-xl font-bold">Your requests</h2>
        <p className="text-sm text-sub">See whether each request is waiting, approved, or declined.</p>
      </div>
      {mine.length === 0 && <Empty>No service requests yet. Your request status will appear here after you submit.</Empty>}
      {mine.map((s) => (
        <Card key={s.id}><div className="flex items-center justify-between"><p className="font-bold">{s.service}: {kgf(s.kg)}</p><Badge tone={tone[s.status]}>{s.status}</Badge></div><p className="text-sm text-sub">{s.id}. {s.date}{s.notes ? `. ${s.notes}` : ""}</p></Card>
      ))}
    </div>
  );
}
